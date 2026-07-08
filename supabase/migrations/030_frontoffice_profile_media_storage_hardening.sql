-- FrontOffice Build 9B
-- Profile media storage hardening
--
-- Goals:
-- 1. Keep profile/banner images working.
-- 2. Limit uploads to approved image types and 10 MB.
-- 3. Users may only upload, replace, or delete files inside:
--      profile-media/<their-auth-user-id>/...
-- 4. Remove older permissive policies that could allow cross-user writes.

begin;

-- ============================================================
-- 1. BUCKET LIMITS
-- ============================================================

update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
where id = 'profile-media';

-- ============================================================
-- 2. REMOVE OLD PROFILE-MEDIA OBJECT POLICIES
-- ============================================================

-- Only drop policies on storage.objects that explicitly reference
-- the profile-media bucket. Other storage buckets are left alone.

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        coalesce(qual, '') ilike '%profile-media%'
        or coalesce(with_check, '') ilike '%profile-media%'
      )
  loop
    execute format(
      'drop policy if exists %I on storage.objects',
      policy_record.policyname
    );
  end loop;
end
$$;

-- ============================================================
-- 3. READ ACCESS
-- ============================================================

-- The current app uses public URLs for avatars and banners.
-- Keep object SELECT available for this bucket.

create policy "FrontOffice profile media is readable"
on storage.objects
for select
to public
using (
  bucket_id = 'profile-media'
);

-- ============================================================
-- 4. OWNER-FOLDER INSERT
-- ============================================================

create policy "Users can upload profile media to own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

-- ============================================================
-- 5. OWNER-FOLDER UPDATE
-- ============================================================

create policy "Users can update profile media in own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

-- ============================================================
-- 6. OWNER-FOLDER DELETE
-- ============================================================

create policy "Users can delete profile media in own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
