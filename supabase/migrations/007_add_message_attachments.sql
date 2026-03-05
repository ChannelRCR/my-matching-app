-- 1. Add attachment columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- 2. Create Storage Bucket for Chat Attachments
-- Important: Supabase uses an internal table for buckets, so you might need to run this manually in the Studio if SQL execution is blocked for `storage` schema.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat_attachments', 'chat_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Security Policies
CREATE POLICY "Users can upload chat attachments" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat_attachments');

CREATE POLICY "Users can view chat attachments" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'chat_attachments');
