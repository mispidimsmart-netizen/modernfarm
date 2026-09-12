-- Add admin policies for ota_firmware table
CREATE POLICY "Super admins can manage firmware"
ON public.ota_firmware
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Create storage bucket for firmware files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('firmware', 'firmware', true, 10485760, ARRAY['application/octet-stream', 'application/macbinary'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for firmware bucket
CREATE POLICY "Anyone can download firmware"
ON storage.objects
FOR SELECT
USING (bucket_id = 'firmware');

CREATE POLICY "Super admins can upload firmware"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'firmware' AND is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete firmware"
ON storage.objects
FOR DELETE
USING (bucket_id = 'firmware' AND is_super_admin(auth.uid()));