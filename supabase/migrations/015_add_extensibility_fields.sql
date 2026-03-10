-- Migration for extensibility features

-- Add new columns for enhanced user profiles to Sellers table
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS industry VARCHAR(255),
ADD COLUMN IF NOT EXISTS industry_other VARCHAR(255);

-- Add new columns for enhanced user profiles to Buyers table
ALTER TABLE buyers
ADD COLUMN IF NOT EXISTS industry VARCHAR(255),
ADD COLUMN IF NOT EXISTS industry_other VARCHAR(255);

-- Add new columns for enhanced invoice parameters to Invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS debtor_entity_type VARCHAR(20) DEFAULT 'corporate',
ADD COLUMN IF NOT EXISTS debtor_postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS industry_other VARCHAR(255),
ADD COLUMN IF NOT EXISTS claim_type VARCHAR(100) DEFAULT '売掛金（商品代金）',
ADD COLUMN IF NOT EXISTS claim_type_other VARCHAR(255);
