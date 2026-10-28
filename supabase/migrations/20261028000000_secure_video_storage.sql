-- Restrict video storage to each authenticated user's own folder.
UPDATE storage.buckets SET public = false WHERE id = 'videos';

DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;

CREATE POLICY "Users upload own videos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE POLICY "Users read own videos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'videos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE POLICY "Users delete own videos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'videos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
