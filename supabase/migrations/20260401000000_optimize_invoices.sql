-- Migration to optimize invoices table
-- Add sale_type column
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sale_type text DEFAULT 'full' CHECK (sale_type IN ('full', 'partial'));

-- Remove redundant user_id if seller_id is used
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='user_id') THEN
    -- In existing schema, seller_id is heavily used. user_id is dropped to avoid duplication.
    ALTER TABLE invoices DROP COLUMN user_id;
  END IF;
END $$;
