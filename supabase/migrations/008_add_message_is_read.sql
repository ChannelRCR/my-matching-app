-- Add is_read column to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Optional: Create an index to speed up unread queries
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(receiver_id, is_read);
