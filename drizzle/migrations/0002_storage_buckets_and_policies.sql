-- 0002: Storage buckets + policies (idempotent).
--
-- Scope: storage infrastructure ONLY. No application tables, no RLS on
-- application tables, no auth changes.
--
-- Buckets:
--   profile-images  — avatars, admin DP, business logo (public display,
--                     owner-scoped writes, max 5 MB)
--   property-images — listing/service/content images (public display,
--                     owner-scoped writes, max 10 MB)
--
-- Write access is enforced server-side to the authenticated user's own
-- top-level folder: (storage.foldername(name))[1] = auth.uid()::text.
-- Admin keeps full management rights via the existing public.is_admin().
--
-- These statements mirror src/lib/storage.server.ts (runtime provisioner)
-- exactly — keep both in sync.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'profile-images',
    'profile-images',
    true,
    5242880,
    array['image/png','image/jpeg','image/webp','image/gif','image/heic','image/heif']::text[]
  ),
  (
    'property-images',
    'property-images',
    true,
    10485760,
    array['image/png','image/jpeg','image/webp','image/gif','image/heic','image/heif']::text[]
  )
on conflict (id) do update set public = true;

-- profile-images -----------------------------------------------------------

drop policy if exists "profile images public read" on storage.objects;
create policy "profile images public read" on storage.objects
  for select to public
  using (bucket_id = 'profile-images');

drop policy if exists "profile images owner insert" on storage.objects;
create policy "profile images owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-images'
    and owner::text = auth.uid()::text
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile images owner update" on storage.objects;
create policy "profile images owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile-images'
    and (owner::text = auth.uid()::text or public.is_admin())
  );

drop policy if exists "profile images owner delete" on storage.objects;
create policy "profile images owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-images'
    and (owner::text = auth.uid()::text or public.is_admin())
  );

-- property-images ----------------------------------------------------------

drop policy if exists "property images public read" on storage.objects;
create policy "property images public read" on storage.objects
  for select to public
  using (bucket_id = 'property-images');

drop policy if exists "property images owner insert" on storage.objects;
create policy "property images owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'property-images'
    and owner::text = auth.uid()::text
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "property images owner update" on storage.objects;
create policy "property images owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'property-images'
    and (owner::text = auth.uid()::text or public.is_admin())
  );

drop policy if exists "property images owner delete" on storage.objects;
create policy "property images owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'property-images'
    and (owner::text = auth.uid()::text or public.is_admin())
  );
