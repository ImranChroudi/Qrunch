-- ===========================================================================
-- MenuQr · 004 — RPC functions
--
-- Every write that must not be blocked by RLS but must still be *validated*
-- lives here. All functions pin search_path and grant EXECUTE explicitly, so
-- the callable surface is exactly the list at the bottom of this file.
--
-- Analytics are restaurant-scoped through current_restaurant_id(); the row
-- level policies on menu_views are the second layer, so a bug in a filter
-- below still cannot expose another tenant's traffic.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- record_menu_view — the only anonymous write path
--
-- menu_views has no INSERT policy for anon: rows only enter through this
-- function, which refuses to record anything for an unpublished restaurant and
-- drops category/item references that do not belong to it (a hostile visitor
-- cannot inflate another restaurant's numbers or poison its FK targets).
-- ---------------------------------------------------------------------------
create or replace function public.record_menu_view(
  p_restaurant_id uuid,
  p_event         public.menu_event default 'menu_view',
  p_source        text  default null,
  p_referrer      text  default null,
  p_device        text  default null,
  p_category_id   uuid  default null,
  p_item_id       uuid  default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category_id uuid := p_category_id;
  v_item_id     uuid := p_item_id;
begin
  -- Only published menus accept traffic.
  if not exists (
    select 1
    from public.restaurants r
    where r.id = p_restaurant_id
      and r.is_published
  ) then
    return;
  end if;

  -- Never trust caller-supplied targets; verify they belong to the restaurant.
  if v_category_id is not null and not exists (
    select 1
    from public.categories c
    where c.id = v_category_id
      and c.restaurant_id = p_restaurant_id
  ) then
    v_category_id := null;
  end if;

  if v_item_id is not null and not exists (
    select 1
    from public.menu_items i
    where i.id = v_item_id
      and i.restaurant_id = p_restaurant_id
  ) then
    v_item_id := null;
  end if;

  insert into public.menu_views (
    restaurant_id, event, source, referrer, device, category_id, item_id
  )
  values (
    p_restaurant_id,
    coalesce(p_event, 'menu_view'),
    left(coalesce(nullif(btrim(p_source), ''), 'direct'), 60),
    nullif(left(coalesce(p_referrer, ''), 400), ''),
    nullif(left(coalesce(p_device, ''), 20), ''),
    v_category_id,
    v_item_id
  );
end;
$$;

revoke all on function public.record_menu_view(
  uuid, public.menu_event, text, text, text, uuid, uuid
) from public;
grant execute on function public.record_menu_view(
  uuid, public.menu_event, text, text, text, uuid, uuid
) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reordering — one round-trip for a drag-and-drop list. display_order is
-- derived from the position of each id in the array; ids the caller does not
-- own are ignored by the RLS-scoped WHERE (and re-checked explicitly).
-- ---------------------------------------------------------------------------

create or replace function public.reorder_categories(p_ids uuid[])
returns integer
language sql
security invoker
set search_path = public
as $$
  with ordered as (
    select id, ordinality as position
    from unnest(p_ids) with ordinality as t(id, ordinality)
  )
  update public.categories c
     set display_order = o.position
    from ordered o
   where c.id = o.id
     and c.restaurant_id = (select public.current_restaurant_id());

  select count(*)::integer
  from (
    select 1
    from unnest(p_ids) with ordinality as t(id, ordinality)
    join public.categories c on c.id = t.id
    where c.restaurant_id = (select public.current_restaurant_id())
  ) checked;
$$;

revoke all on function public.reorder_categories(uuid[]) from public;
grant execute on function public.reorder_categories(uuid[]) to authenticated;

create or replace function public.reorder_menu_items(p_ids uuid[])
returns integer
language sql
security invoker
set search_path = public
as $$
  with ordered as (
    select id, ordinality as position
    from unnest(p_ids) with ordinality as t(id, ordinality)
  )
  update public.menu_items i
     set display_order = o.position
    from ordered o
   where i.id = o.id
     and i.restaurant_id = (select public.current_restaurant_id());

  select count(*)::integer
  from (
    select 1
    from unnest(p_ids) with ordinality as t(id, ordinality)
    join public.menu_items i on i.id = t.id
    where i.restaurant_id = (select public.current_restaurant_id())
  ) checked;
$$;

revoke all on function public.reorder_menu_items(uuid[]) from public;
grant execute on function public.reorder_menu_items(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- create_restaurant_for_self — signup -> tenant
--
-- A user may only call this once, only for themselves, and only while their
-- profile is still unlinked. The slug is always server-derived: a client can
-- suggest one but cannot smuggle in a URL-unsafe or already-taken value.
-- ---------------------------------------------------------------------------
create or replace function public.create_restaurant_for_self(
  p_restaurant_name text,
  p_slug            text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user       uuid := auth.uid();
  v_restaurant uuid;
  v_slug       text;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if exists (
    select 1 from public.profiles p
    where p.id = v_user and p.restaurant_id is not null
  ) then
    raise exception 'Account is already linked to a restaurant'
      using errcode = 'insufficient_privilege';
  end if;

  v_slug := coalesce(
    nullif(public.slugify(p_slug), ''),
    public.generate_unique_restaurant_slug(p_restaurant_name)
  );

  if exists (select 1 from public.restaurants r where r.slug = v_slug) then
    v_slug := public.generate_unique_restaurant_slug(v_slug);
  end if;

  insert into public.restaurants (name, slug)
  values (btrim(p_restaurant_name), v_slug)
  returning id into v_restaurant;

  insert into public.profiles (id, restaurant_id, role)
  values (v_user, v_restaurant, 'owner')
  on conflict (id) do update
    set restaurant_id = excluded.restaurant_id,
        updated_at    = now()
  where public.profiles.restaurant_id is null;

  return v_restaurant;
end;
$$;

revoke all on function public.create_restaurant_for_self(text, text) from public, anon;
grant execute on function public.create_restaurant_for_self(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- provision_restaurant — platform / seed only
--
-- service_role bypasses RLS and the write guards, but is still forced through
-- this function so provisioning stays idempotent: calling it for an account
-- that already has a restaurant returns the existing tenant untouched.
-- ---------------------------------------------------------------------------
create or replace function public.provision_restaurant(
  p_user_id         uuid,
  p_restaurant_name text,
  p_role            public.app_role default 'owner',
  p_slug            text default null,
  p_email           text default null,
  p_full_name       text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_restaurant uuid;
  v_slug       text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'provision_restaurant is platform-only'
      using errcode = 'insufficient_privilege';
  end if;

  select p.restaurant_id into v_restaurant
  from public.profiles p
  where p.id = p_user_id;

  if v_restaurant is not null then
    update public.profiles
       set email     = coalesce(nullif(p_email, ''), email),
           full_name = coalesce(nullif(p_full_name, ''), full_name),
           role      = coalesce(p_role, role),
           updated_at = now()
     where id = p_user_id;

    return v_restaurant;
  end if;

  v_slug := coalesce(
    nullif(public.slugify(p_slug), ''),
    public.generate_unique_restaurant_slug(p_restaurant_name)
  );

  if exists (select 1 from public.restaurants r where r.slug = v_slug) then
    v_slug := public.generate_unique_restaurant_slug(v_slug);
  end if;

  insert into public.restaurants (name, slug)
  values (btrim(p_restaurant_name), v_slug)
  returning id into v_restaurant;

  insert into public.profiles (id, restaurant_id, role, email, full_name)
  values (
    p_user_id,
    v_restaurant,
    coalesce(p_role, 'owner'),
    coalesce(p_email, ''),
    nullif(left(coalesce(p_full_name, ''), 120), '')
  )
  on conflict (id) do update
    set restaurant_id = excluded.restaurant_id,
        role          = excluded.role,
        updated_at    = now();

  return v_restaurant;
end;
$$;

revoke all on function public.provision_restaurant(
  uuid, text, public.app_role, text, text, text
) from public, anon, authenticated;
grant execute on function public.provision_restaurant(
  uuid, text, public.app_role, text, text, text
) to service_role;

-- ---------------------------------------------------------------------------
-- Analytics
-- ---------------------------------------------------------------------------

-- Daily buckets for the dashboard chart: one row per (day, event, source) with
-- at least one view. The app fills the gaps to render a continuous axis.
create or replace function public.get_menu_analytics(p_days integer default 30)
returns table (day date, event public.menu_event, source text, views bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select (mv.created_at at time zone 'utc')::date as day,
         mv.event,
         mv.source,
         count(*)::bigint as views
  from public.menu_views mv
  where mv.restaurant_id = (select public.current_restaurant_id())
    and mv.created_at >= now() - make_interval(days => greatest(coalesce(p_days, 30), 1))
  group by 1, 2, 3
  order by 1;
$$;

revoke all on function public.get_menu_analytics(integer) from public, anon;
grant execute on function public.get_menu_analytics(integer) to authenticated;

-- Headline totals over the window plus the previous window of equal length,
-- so the dashboard can render a delta. The `values` list *must* cast to the
-- enum, otherwise Postgres types the column as text and the join against
-- menu_views.event (public.menu_event) fails with 42883.
create or replace function public.get_analytics_summary(p_days integer default 30)
returns table (metric text, value bigint, previous bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with bucketed as (
    select mv.event,
           mv.source,
           case
             when mv.created_at >= now() - make_interval(days => greatest(coalesce(p_days, 30), 1))
               then 'current'
             else 'previous'
           end as period
    from public.menu_views mv
    where mv.restaurant_id = (select public.current_restaurant_id())
      and mv.created_at >= now()
            - make_interval(days => greatest(coalesce(p_days, 30), 1) * 2)
  )
  select m.metric,
         count(*) filter (where b.period = 'current')::bigint  as value,
         count(*) filter (where b.period = 'previous')::bigint as previous
  from (values
    ('menu_views',     'menu_view'::public.menu_event),
    ('item_views',     'item_view'::public.menu_event),
    ('category_views', 'category_view'::public.menu_event),
    ('qr_scans',       'menu_view'::public.menu_event)
  ) as m(metric, event)
  left join bucketed b
    on b.event = m.event
   and (m.metric <> 'qr_scans' or b.source = 'qr')
  group by m.metric;
$$;

revoke all on function public.get_analytics_summary(integer) from public, anon;
grant execute on function public.get_analytics_summary(integer) to authenticated;

-- "Most viewed dishes" table.
create or replace function public.get_top_viewed_items(
  p_days  integer default 30,
  p_limit integer default 8
)
returns table (
  item_id      uuid,
  item_name    text,
  image_url    text,
  is_available boolean,
  views        bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select i.id,
         i.name,
         i.image_url,
         i.is_available,
         count(*)::bigint as views
  from public.menu_views mv
  join public.menu_items i on i.id = mv.item_id
  where mv.restaurant_id = (select public.current_restaurant_id())
    and mv.event = 'item_view'
    and mv.created_at >= now() - make_interval(days => greatest(coalesce(p_days, 30), 1))
  group by i.id, i.name, i.image_url, i.is_available
  order by views desc, i.name
  limit greatest(coalesce(p_limit, 8), 1);
$$;

revoke all on function public.get_top_viewed_items(integer, integer) from public, anon;
grant execute on function public.get_top_viewed_items(integer, integer) to authenticated;