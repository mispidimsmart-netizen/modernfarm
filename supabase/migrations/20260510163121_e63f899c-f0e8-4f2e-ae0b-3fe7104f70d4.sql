INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('firmware', 'firmware', true, 8388608, ARRAY['application/octet-stream'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 8388608;

CREATE POLICY "Public read firmware files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'firmware');

CREATE POLICY "Super admins upload firmware"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'firmware' AND public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins update firmware"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'firmware' AND public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins delete firmware"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'firmware' AND public.is_super_admin(auth.uid()));