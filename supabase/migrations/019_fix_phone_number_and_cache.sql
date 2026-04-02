-- 1. Ensure phone_number column exists on both sellers and buyers tables
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS phone_number TEXT;

ALTER TABLE buyers
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- (Optional but safe) Ensure other profile base fields from the original users table are also safely propagated if they were missed
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS trade_name TEXT,
ADD COLUMN IF NOT EXISTS representative_name TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS bank_account_info TEXT;

ALTER TABLE buyers
ADD COLUMN IF NOT EXISTS trade_name TEXT,
ADD COLUMN IF NOT EXISTS representative_name TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS bank_account_info TEXT;

-- 2. Force PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
