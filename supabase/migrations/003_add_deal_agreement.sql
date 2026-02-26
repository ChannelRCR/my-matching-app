-- Add agreement and contract timestamps to the deals table
ALTER TABLE public.deals 
ADD COLUMN seller_agreed_at timestamp with time zone,
ADD COLUMN buyer_agreed_at timestamp with time zone,
ADD COLUMN contract_date timestamp with time zone;

-- Update the status check constraint to include 'concluded'
ALTER TABLE public.deals 
DROP CONSTRAINT deals_status_check;

ALTER TABLE public.deals 
ADD CONSTRAINT deals_status_check
CHECK (status in ('negotiating', 'agreed', 'rejected', 'concluded'));
