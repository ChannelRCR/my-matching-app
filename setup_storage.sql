-- Supabase Storage Setup for Evidence files (証拠書類)
-- Run this in your Supabase SQL Editor

-- 1. Create the bucket (Public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence', 'evidence', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow authenticated users to upload files to their own folder
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'evidence' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Allow public or authenticated users to read files (since it's a public bucket, we can optionally make it accessible to authenticated only in the app, but public read policy is needed for getPublicUrl to work properly)
CREATE POLICY "Allow public read" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'evidence');

-- 4. Allow authenticated users to update/delete their own files (Optional but good practice)
CREATE POLICY "Allow users to update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'evidence' AND auth.uid()::text = (storage.foldername(name))[1]);
