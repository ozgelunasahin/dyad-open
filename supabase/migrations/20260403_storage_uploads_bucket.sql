-- Create the uploads storage bucket for cover images and other user uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files into their own folder (userId/filename)
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'uploads' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Allow anyone to read uploaded files (public bucket)
CREATE POLICY "Public read uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'uploads');
