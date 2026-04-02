-- Add agreement and contract timestamps to the deals table
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS seller_agreed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS buyer_agreed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS contract_date timestamp with time zone;

-- Update the status check constraint to include 'concluded'
ALTER TABLE public.deals 
DROP CONSTRAINT IF EXISTS deals_status_check;

ALTER TABLE public.deals 
ADD CONSTRAINT deals_status_check
CHECK (status in ('negotiating', 'agreed', 'rejected', 'concluded'));
