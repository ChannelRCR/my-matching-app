-- Add negotiation price columns to deals table
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS current_seller_price INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_buyer_price INTEGER DEFAULT 0;

-- Ensure invoices created_at is accessible in views if requested (it usually is by default)
