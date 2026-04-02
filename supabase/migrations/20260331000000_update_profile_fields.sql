-- Add corporate_number, website_url, and id_document_url to sellers and buyers
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS corporate_number TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS id_document_url TEXT;

ALTER TABLE buyers 
ADD COLUMN IF NOT EXISTS corporate_number TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS id_document_url TEXT;

-- Drop 'phone' column if it exists, since 'phone_number' is the one actively used
ALTER TABLE sellers DROP COLUMN IF EXISTS phone;
ALTER TABLE buyers DROP COLUMN IF EXISTS phone;
