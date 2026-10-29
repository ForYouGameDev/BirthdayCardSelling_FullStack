-- 0004_storage.sql
--   product-images : PUBLIC  - card photos shown in the shop. Only admins can upload.
--   personalization: PRIVATE - photos customers upload for a personalised card.
--                    Each customer can only touch files inside a folder named after their own user id.
--                    Admins can read them (to print the card). Nobody else, ever.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images',  'product-images',  true,  5242880,  array['image/webp','image/jpeg','image/png']),
  ('personalization', 'personalization', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- product-images
create policy "product images are public" on storage.objects for select
  using (bucket_id = 'product-images');
create policy "product images admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "product images admin update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin()) with check (bucket_id = 'product-images' and public.is_admin());
create policy "product images admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- personalization (private)
create policy "personalization own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'personalization' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "personalization own read" on storage.objects for select to authenticated
  using (bucket_id = 'personalization' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "personalization own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'personalization' and (storage.foldername(name))[1] = auth.uid()::text);
