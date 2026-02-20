-- Add new profile fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS trade_name TEXT,
ADD COLUMN IF NOT EXISTS representative_name TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS bank_account_info TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS email_address TEXT,
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"tradeName": true, "representativeName": true, "contactPerson": true, "address": true, "bankAccountInfo": true, "phoneNumber": true, "emailAddress": true}'::jsonb;

-- No changes needed for invoices table structure as company_size is text, 
-- but application logic will enforce new enum values.
