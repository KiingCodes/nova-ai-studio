DROP POLICY IF EXISTS "project-media public read" ON storage.objects;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'project-media users read own folder'
  ) THEN
    CREATE POLICY "project-media users read own folder"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'project-media' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.is_workspace_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_workspace_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_workspace_owner(uuid, uuid) TO service_role;