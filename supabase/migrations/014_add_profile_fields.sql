-- Add new columns for enhanced user profiles to Sellers table
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS entity_type VARCHAR(20) DEFAULT 'corporate',
ADD COLUMN IF NOT EXISTS has_no_trade_name BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS company_name_kana VARCHAR(255),
ADD COLUMN IF NOT EXISTS representative_name_kana VARCHAR(255),
ADD COLUMN IF NOT EXISTS appeal_point TEXT;

-- Update privacy_settings default for Sellers to include new fields (if needed, but we can manage this at the application level or update the default)
-- The application will merge new privacy settings as needed.

-- Add new columns for enhanced user profiles to Buyers table
ALTER TABLE buyers
ADD COLUMN IF NOT EXISTS entity_type VARCHAR(20) DEFAULT 'corporate',
ADD COLUMN IF NOT EXISTS has_no_trade_name BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS company_name_kana VARCHAR(255),
ADD COLUMN IF NOT EXISTS representative_name_kana VARCHAR(255),
ADD COLUMN IF NOT EXISTS appeal_point TEXT;

-- (DML UPDATE statements removed to prevent webhook triggering and OOM)
