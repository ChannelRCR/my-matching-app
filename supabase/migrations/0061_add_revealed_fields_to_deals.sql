-- Add new JSONB columns for gradual information disclosure feature
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS seller_revealed_fields JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS buyer_revealed_fields JSONB DEFAULT '{}'::jsonb;
