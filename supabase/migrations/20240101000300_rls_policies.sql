-- ===========================================================================
-- MenuQr · 003 — authorisation helpers, RLS policies, write guards
--
-- Enforcement model
-- -----------------
--   anon        -> read published restaurants + their active categories/items
--   authenticated (owner | manager of restaurant X)
--               -> full CRUD on exactly restaurant X
--
-- A caller's restaurant is never read from the request. It is derived from the
-- session by `current_restaurant_id()`, which is SECURITY DEFINER precisely so
-- that reading `profiles` does not re-enter `profiles`' own RLS policy.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- The restaurant the current session belongs to, or NULL.
-- SECURITY DEFINER + pinned search_path: the function owner (postgres) bypasses
-- RLS on `profiles`, and pinning search_path prevents search_path hijacking.
create or replace function public.current_restaurant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.restaurant_id
  from public.profiles p
  where p.id = auth.uid()
$$;

revoke all on function public.current_restaurant_id() from public;
grant execute on function public.current_restaurant_id() to authenticated;

-- Whether a restaurant is currently serving a public menu. SECURITY DEFINER so
-- anonymous callers can evaluate it without direct read access to `restaurants`.
-- Returns a boolean only — no column data crosses this boundary.
create or replace function public.is_publicly_visible(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurants r
    where r.id = p_restaurant_id
      and r.is_published
  )
$$;

revoke all on function public.is_publicly_visible(uuid) from public;
grant execute on function public.is_publicly_visible(uuid) to anon, authenticated;

-- True when the caller is an `owner` of the restaurant they are reading.
create or replace function public.is_restaurant_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'owner'
      and p.restaurant_id is not null
  )
$$;

revoke all on function public.is_restaurant_owner() from public;
grant execute on function public.is_restaurant_owner() to authenticated;

-- ---------------------------------------------------------------------------
-- Slug helpers
-- ---------------------------------------------------------------------------

create or replace function public.slugify(input text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select nullif(
    trim(both '-' from
      regexp_replace(
        regexp_replace(lower(unaccent(coalesce(input, ''))), '[^a-z0-9]+', '-', 'g'),
        '-{2,}', '-', 'g'
      )
    ),
    ''
  )
$$;

-- First free slug for a restaurant name: "Pizza House" -> "pizza-house",
-- then "pizza-house-2", "pizza-house-3", ...
create or replace function public.generate_unique_restaurant_slug(p_name text)
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  v_base   text := coalesce(public.slugify(p_name), 'restaurant');
  v_try    text;
  v_suffix integer := 1;
begin
  v_base := left(v_base, 70);
  v_try  := v_base;

  while exists (select 1 from public.restaurants r where r.slug = v_try) loop
    v_suffix := v_suffix + 1;
    v_try := v_base || '-' || v_suffix;
  end loop;

  return v_try;
end;
$$;

revoke all on function public.generate_unique_restaurant_slug(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Write guards — invariants that must hold no matter who calls
-- ---------------------------------------------------------------------------

-- A user must never be able to re-point their profile at another restaurant,
-- grant themselves a role, or rewrite the email we key off for auth.
create or replace function public.profiles_guard_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.restaurant_id is distinct from old.restaurant_id
     and old.restaurant_id is not null then
    raise exception 'restaurant_id cannot be reassigned'
      using errcode = 'insufficient_privilege';
  end if;

  if new.role is distinct from old.role then
    raise exception 'role can only be changed by the platform'
      using errcode = 'insufficient_privilege';
  end if;

  if new.email is distinct from old.email then
    raise exception 'email must be changed through Supabase Auth'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger profiles_guard_columns
  before update on public.profiles
  for each row execute function public.profiles_guard_columns();

-- Billing state is platform-controlled. Even an owner cannot promote the
-- restaurant to a paid plan from the dashboard.
create or replace function public.restaurants_guard_plan()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.plan is distinct from old.plan then
    raise exception 'subscription plan is managed by the platform'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger restaurants_guard_plan
  before update on public.restaurants
  for each row execute function public.restaurants_guard_plan();

-- Every signup gets a profile immediately. `restaurant_id` stays NULL until a
-- restaurant is provisioned; RLS then grants that account no data access, and
-- the dashboard shows an explicit "not linked yet" state.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere. A table with RLS enabled and no matching policy is
-- completely closed to that role, which is the default we want.
-- ---------------------------------------------------------------------------
alter table public.restaurants enable row level security;
alter table public.categories   enable row level security;
alter table public.menu_items   enable row level security;
alter table public.profiles     enable row level security;
alter table public.menu_views   enable row level security;

-- ---------------------------------------------------------------------------
-- restaurants
-- ---------------------------------------------------------------------------

-- Public menu readers. Note this exposes every column, which is acceptable:
-- the table holds no secrets by design (documented in migration 002).
create policy "restaurants_public_read"
  on public.restaurants
  for select
  to anon, authenticated
  using (is_published);

-- Admins additionally see their own restaurant even while unpublished.
create policy "restaurants_admin_read"
  on public.restaurants
  for select
  to authenticated
  using (id = (select public.current_restaurant_id()));

create policy "restaurants_admin_update"
  on public.restaurants
  for update
  to authenticated
  using (id = (select public.current_restaurant_id()))
  with check (id = (select public.current_restaurant_id()));

-- INSERT / DELETE are intentionally absent: restaurants are provisioned by the
-- platform through provision_restaurant() / create_restaurant_for_self(), so a
-- compromised admin token cannot spin up tenants.

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

create policy "categories_public_read"
  on public.categories
  for select
  to anon, authenticated
  using (is_active and public.is_publicly_visible(restaurant_id));

create policy "categories_admin_all"
  on public.categories
  for all
  to authenticated
  using (restaurant_id = (select public.current_restaurant_id()))
  with check (restaurant_id = (select public.current_restaurant_id()));

-- ---------------------------------------------------------------------------
-- menu_items
-- ---------------------------------------------------------------------------

-- An item is public when it is listed (`is_active`), its category is visible,
-- and the restaurant is serving. Sold-out items stay visible — the customer is
-- told they are unavailable rather than being shown a dish that may return.
create policy "menu_items_public_read"
  on public.menu_items
  for select
  to anon, authenticated
  using (
    is_active
    and exists (
      select 1
      from public.categories c
      where c.id = menu_items.category_id
        and c.is_active
        and public.is_publicly_visible(c.restaurant_id)
    )
  );

create policy "menu_items_admin_all"
  on public.menu_items
  for all
  to authenticated
  using (restaurant_id = (select public.current_restaurant_id()))
  with check (restaurant_id = (select public.current_restaurant_id()));

-- ---------------------------------------------------------------------------
-- profiles — strictly private
-- ---------------------------------------------------------------------------

create policy "profiles_self_read"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles_self_update"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "profiles_self_insert"
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()));

-- Colleagues in the same restaurant (for the Account > Team view).
create policy "profiles_restaurant_read"
  on public.profiles
  for select
  to authenticated
  using (restaurant_id = (select public.current_restaurant_id()));

-- ---------------------------------------------------------------------------
-- menu_views — read-only for admins, anonymous writes go through the RPC
-- ---------------------------------------------------------------------------

create policy "menu_views_admin_read"
  on public.menu_views
  for select
  to authenticated
  using (restaurant_id = (select public.current_restaurant_id()));
