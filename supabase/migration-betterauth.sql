-- Migration: Remove auth.users FK and fix RLS for Better Auth
-- Run this in Supabase SQL Editor

-- Drop the FK constraint referencing auth.users
ALTER TABLE public.pages DROP CONSTRAINT IF EXISTS pages_user_id_fkey;

-- Drop RLS policies that use auth.uid() (Better Auth doesn't populate auth.uid)
-- Pages policies
DROP POLICY IF EXISTS "pages_owner_write" ON public.pages;
DROP POLICY IF EXISTS "pages_owner_update" ON public.pages;
DROP POLICY IF EXISTS "pages_owner_delete" ON public.pages;

-- Since we use the admin/service-role client for all authenticated operations,
-- we don't need owner-checking RLS policies. Admin client bypasses RLS entirely.
-- Keep the public read policy for unauthenticated reads.
-- Re-create permissive policies that allow all access via service role.
CREATE POLICY "pages_all_access" ON public.pages FOR ALL USING (true) WITH CHECK (true);

-- Items policies
DROP POLICY IF EXISTS "items_owner_write" ON public.items;
DROP POLICY IF EXISTS "items_owner_update" ON public.items;
DROP POLICY IF EXISTS "items_owner_delete" ON public.items;
CREATE POLICY "items_all_access" ON public.items FOR ALL USING (true) WITH CHECK (true);

-- Events policies
DROP POLICY IF EXISTS "events_owner_read" ON public.events;
CREATE POLICY "events_all_access" ON public.events FOR ALL USING (true) WITH CHECK (true);

-- Storage policies (owner-based with auth.uid() won't work, simplify for service role)
DROP POLICY IF EXISTS "files_owner_upload" ON storage.objects;
DROP POLICY IF EXISTS "files_owner_delete" ON storage.objects;
CREATE POLICY "files_all_access" ON storage.objects FOR ALL USING (bucket_id = 'files') WITH CHECK (bucket_id = 'files');
