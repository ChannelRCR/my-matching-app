-- Migration to add payment_status to deals table

-- Enable payment_status column with a default of 'pending'
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

-- Add a comment explaining states: pending, paid, completed
COMMENT ON COLUMN deals.payment_status IS 'Tracks the payment status of concluded deals: pending (waiting for payment), paid (buyer reported payment), completed (seller confirmed receipt).';
