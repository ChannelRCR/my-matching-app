-- Ensure extensibility fields are present on sellers table
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS appeal_point TEXT,
ADD COLUMN IF NOT EXISTS industry VARCHAR(255),
ADD COLUMN IF NOT EXISTS industry_other VARCHAR(255);

-- Ensure extensibility fields are present on buyers table
ALTER TABLE buyers
ADD COLUMN IF NOT EXISTS appeal_point TEXT,
ADD COLUMN IF NOT EXISTS industry VARCHAR(255),
ADD COLUMN IF NOT EXISTS industry_other VARCHAR(255);

-- Ensure extensibility fields are present on invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS debtor_entity_type VARCHAR(20) DEFAULT 'corporate',
ADD COLUMN IF NOT EXISTS debtor_postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS industry_other VARCHAR(255),
ADD COLUMN IF NOT EXISTS claim_type VARCHAR(100) DEFAULT '売掛金（商品代金）',
ADD COLUMN IF NOT EXISTS claim_type_other VARCHAR(255);

-- Force PostgREST to reload the schema cache so the frontend can immediately see the new columns
NOTIFY pgrst, 'reload schema';
