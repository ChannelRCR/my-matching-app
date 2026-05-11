-- Add notification flag and contract execution certificate fields to deals table
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS match_notification_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS buyer_signature_name TEXT,
ADD COLUMN IF NOT EXISTS buyer_ip_address TEXT,
ADD COLUMN IF NOT EXISTS buyer_user_agent TEXT,
ADD COLUMN IF NOT EXISTS seller_signature_name TEXT,
ADD COLUMN IF NOT EXISTS seller_ip_address TEXT,
ADD COLUMN IF NOT EXISTS seller_user_agent TEXT;
