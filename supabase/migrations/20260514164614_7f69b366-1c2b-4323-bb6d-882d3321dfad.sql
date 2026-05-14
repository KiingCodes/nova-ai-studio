insert into storage.buckets (id, name, public)
values ('project-media', 'project-media', true)
on conflict (id) do nothing;

create policy "project-media public read"
on storage.objects for select
using (bucket_id = 'project-media');

create policy "project-media users insert own folder"
on storage.objects for insert to authenticated
with check (bucket_id = 'project-media' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "project-media users update own folder"
on storage.objects for update to authenticated
using (bucket_id = 'project-media' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "project-media users delete own folder"
on storage.objects for delete to authenticated
using (bucket_id = 'project-media' and auth.uid()::text = (storage.foldername(name))[1]);