-- ===========================================================================
-- MenuQr · 005 — object storage
--
-- Four public buckets, one per asset class. Public *read* is intentional: the
-- customer menu renders these images with next/image and must not spend a
-- request on an authorisation round-trip.
--
-- Write access is not public. Every upload path is
--   {restaurant_id}/{uuid}.{ext}
-- and policies compare that first path segment against the caller's restaurant,
-- so an admin token physically cannot write into another tenant's folder or
-- overwrite an existing object (updates require ownership of the folder).
--
-- MIME type and size are additionally enforced by the bucket metadata below,
-- so a caller cannot get an executable or 200 MB file past the API even if the
-- client-side checks in components/uploads/image-uploader.tsx were bypassed.
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('restaurant-logos',  'restaurant-logos',  true, 2097152,
     array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('restaurant-covers', 'restaurant-covers', true, 6291456,
     array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('category-images',   'category-images',   true, 4194304,
     array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('menu-item-images',  'menu-item-images',  true, 4194304,
     array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public              = excluded.public,
      file_size_limit     = excluded.file_size_limit,
      allowed_mime_types  = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

create policy "storage_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id in (
      'restaurant-logos',
      'restaurant-covers',
      'category-images',
      'menu-item-images'
    )
  );

create policy "storage_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id in (
      'restaurant-logos',
      'restaurant-covers',
      'category-images',
      'menu-item-images'
    )
    and (storage.foldername(name))[1] = (select public.current_restaurant_id())::text
  );

create policy "storage_admin_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id in (
      'restaurant-logos',
      'restaurant-covers',
      'category-images',
      'menu-item-images'
    )
    and (storage.foldername(name))[1] = (select public.current_restaurant_id())::text
  )
  with check (
    bucket_id in (
      'restaurant-logos',
      'restaurant-covers',
      'category-images',
      'menu-item-images'
    )
    and (storage.foldername(name))[1] = (select public.current_restaurant_id())::text
  );

create policy "storage_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id in (
      'restaurant-logos',
      'restaurant-covers',
      'category-images',
      'menu-item-images'
    )
    and (storage.foldername(name))[1] = (select public.current_restaurant_id())::text
  );
