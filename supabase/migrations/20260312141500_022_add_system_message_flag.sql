-- Add is_system_message flag to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_system_message BOOLEAN DEFAULT FALSE;
