-- ===========================================================================
-- MenuQr · 001 — extensions & types
-- ===========================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Visual treatment of the public menu.
create type public.menu_style as enum ('modern', 'classic', 'minimal');

-- Who can do what inside a restaurant.
create type public.app_role as enum ('owner', 'manager');

-- Reserved for the billing milestone: a restaurant's plan gates features such
-- as custom domains and multi-branch. Nothing in the MVP reads it yet, but the
-- column exists so adding billing later is a migration, not a rewrite.
create type public.subscription_plan as enum ('free', 'pro');

-- Analytics events we are willing to record.
create type public.menu_event as enum ('menu_view', 'category_view', 'item_view');
