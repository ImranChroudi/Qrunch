-- ===========================================================================
-- MenuQr · 002 — schema
--
-- Tenancy model: every business table carries `restaurant_id`. Supabase Auth
-- users are mapped to exactly one restaurant through `profiles`, and Row Level
-- Security (migration 003) derives the caller's restaurant from that row. There
-- is no code path in the app that accepts a restaurant_id from the client for
-- writes — RLS rejects cross-tenant writes even if it did.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- restaurants
-- ---------------------------------------------------------------------------
create table public.restaurants (
  id               uuid primary key default gen_random_uuid(),

  name             text not null
                     check (char_length(btrim(name)) between 2 and 120),

  -- citext gives us case-insensitive uniqueness ("Pizza-House" == "pizza-house")
  -- while the check constraint guarantees the value stays URL-safe.
  slug             citext not null unique
                     check (slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
                            and char_length(slug::text) between 2 and 80),

  description      text check (char_length(description) <= 2000),
  logo_url         text check (char_length(logo_url) <= 2048),
  cover_url        text check (char_length(cover_url) <= 2048),

  phone            text check (char_length(phone) <= 40),
  whatsapp         text check (char_length(whatsapp) <= 40),
  address          text check (char_length(address) <= 400),
  opening_hours    text check (char_length(opening_hours) <= 1000),
  instagram        text check (char_length(instagram) <= 200),
  facebook         text check (char_length(facebook) <= 200),

  primary_color    text not null default '#b45309'
                     check (primary_color ~* '^#[0-9a-f]{6}$'),
  secondary_color  text not null default '#1c1917'
                     check (secondary_color ~* '^#[0-9a-f]{6}$'),
  menu_style       public.menu_style not null default 'modern',

  currency         text not null default 'MAD'
                     check (currency ~ '^[A-Z]{3}$'),
  locale           text not null default 'en'
                     check (locale ~ '^[a-z]{2}(-[a-z]{2})?$'),
  timezone         text not null default 'Africa/Casablanca',

  -- `is_published` is the master switch for the public menu.
  -- `is_indexable` lets an owner opt out of search-engine indexing.
  is_published      boolean not null default true,
  is_indexable      boolean not null default true,

  plan             public.subscription_plan not null default 'free',

  -- Reserved for translations: { "fr": { "name": "..." }, "ar": { ... } }.
  -- The public menu resolves against it when present and falls back to the
  -- scalar columns above, so a single-language MVP needs no extra work.
  translations     jsonb not null default '{}'::jsonb
                     check (jsonb_typeof(translations) = 'object'),

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.restaurants is
  'One row per restaurant. Contains no secrets: every column here is either '
  'public menu content or branding, which is why anonymous visitors may read it '
  'when is_published = true.';

-- ---------------------------------------------------------------------------
-- profiles — links an auth.users row to a restaurant
-- ---------------------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  -- Nullable on purpose: a brand-new signup has no restaurant yet. The app
  -- renders an "account not linked" state, and RLS grants zero access while
  -- this is NULL (comparisons against NULL are never true).
  restaurant_id  uuid references public.restaurants (id) on delete cascade,
  full_name      text check (char_length(full_name) <= 120),
  email          text not null check (char_length(email) <= 320),
  role           public.app_role not null default 'owner',
  avatar_url     text check (char_length(avatar_url) <= 2048),
  locale         text not null default 'en' check (locale ~ '^[a-z]{2}(-[a-z]{2})?$'),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index profiles_restaurant_id_idx on public.profiles (restaurant_id);

comment on table public.profiles is
  'Private. Never readable by anonymous visitors — RLS allows a row only to the '
  'user it belongs to.';

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  name           text not null check (char_length(btrim(name)) between 1 and 80),
  description    text check (char_length(description) <= 500),
  image_url      text check (char_length(image_url) <= 2048),
  emoji          text check (emoji is null or char_length(emoji) <= 16),
  display_order  integer not null default 0,
  is_active      boolean not null default true,
  translations   jsonb not null default '{}'::jsonb
                   check (jsonb_typeof(translations) = 'object'),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Referenced by the composite FK on menu_items below.
  constraint categories_id_restaurant_key unique (id, restaurant_id)
);

create unique index categories_restaurant_name_key
  on public.categories (restaurant_id, lower(name));

create index categories_public_order_idx
  on public.categories (restaurant_id, display_order)
  where is_active;

-- ---------------------------------------------------------------------------
-- menu_items
-- ---------------------------------------------------------------------------
create table public.menu_items (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  category_id    uuid not null,
  name           text not null check (char_length(btrim(name)) between 1 and 140),
  description    text check (char_length(description) <= 1000),
  price          numeric (10, 2) not null
                   check (price >= 0 and price <= 999999.99),
  image_url      text check (char_length(image_url) <= 2048),

  -- is_available = "sold out right now": still listed for the customer, drawn
  -- greyed out with a badge. is_active = "do not list at all": hidden.
  is_available   boolean not null default true,
  is_featured    boolean not null default false,
  is_active      boolean not null default true,

  display_order  integer not null default 0,
  tags           text[] not null default '{}',
  translations   jsonb not null default '{}'::jsonb
                   check (jsonb_typeof(translations) = 'object'),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Database-level guarantee of tenant isolation: a menu item cannot point at
  -- another restaurant's category even if application code is wrong or bypassed.
  constraint menu_items_category_restaurant_fkey
    foreign key (category_id, restaurant_id)
    references public.categories (id, restaurant_id)
    on delete cascade
);

create index menu_items_category_order_idx
  on public.menu_items (restaurant_id, category_id, display_order);

create index menu_items_active_idx
  on public.menu_items (restaurant_id, is_active, is_available);

-- Full-text search for the customer-facing menu search bar, French/English
-- aware (simple config keeps accents and avoids stemming surprises).
alter table public.menu_items
  add column search_document tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) stored;

create index menu_items_search_idx
  on public.menu_items using gin (search_document);

-- ---------------------------------------------------------------------------
-- menu_views — append-only analytics
-- ---------------------------------------------------------------------------
create table public.menu_views (
  id             bigint generated always as identity primary key,
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  event          public.menu_event not null default 'menu_view',
  category_id    uuid references public.categories (id) on delete set null,
  item_id        uuid references public.menu_items (id) on delete set null,
  -- Where the visitor came from. 'qr' when the QR code appended ?src=qr.
  source         text not null default 'direct',
  referrer       text check (char_length(referrer) <= 400),
  device         text check (char_length(device) <= 20),
  created_at     timestamptz not null default now()
);

create index menu_views_restaurant_created_idx
  on public.menu_views (restaurant_id, created_at desc);

create index menu_views_item_idx on public.menu_views (item_id, created_at desc)
  where event = 'item_view';

comment on table public.menu_views is
  'Append-only. Anonymous visitors may not read it and may not insert directly; '
  'rows only enter through public.record_menu_view(), which validates that the '
  'target belongs to a published restaurant. No IP addresses or user agents are '
  'stored.';

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger restaurants_set_updated_at
  before update on public.restaurants
  for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
