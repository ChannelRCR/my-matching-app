-- Create sellers table
CREATE TABLE IF NOT EXISTS sellers (
  id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  trade_name TEXT,
  representative_name TEXT,
  contact_person TEXT,
  address TEXT,
  bank_account_info TEXT,
  phone_number TEXT,
  email_address TEXT,
  privacy_settings JSONB DEFAULT '{"tradeName": true, "representativeName": true, "contactPerson": true, "address": true, "bankAccountInfo": true, "phoneNumber": true, "emailAddress": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for sellers
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

-- Create policy for sellers (viewable by everyone? or just the owner and relevant parties? For now public based on MVP)
CREATE POLICY "Public profiles are viewable by everyone" ON sellers FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON sellers FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON sellers FOR UPDATE USING (auth.uid() = id);

-- Create buyers table
CREATE TABLE IF NOT EXISTS buyers (
  id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  trade_name TEXT,
  representative_name TEXT,
  contact_person TEXT,
  address TEXT,
  phone_number TEXT,
  email_address TEXT, -- Buyers might not need bank account info explicitly in profile? Added for consistency based on request
  privacy_settings JSONB DEFAULT '{"tradeName": true, "representativeName": true, "contactPerson": true, "address": true, "phoneNumber": true, "emailAddress": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for buyers
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;

-- Create policy for buyers
CREATE POLICY "Public profiles are viewable by everyone" ON buyers FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON buyers FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON buyers FOR UPDATE USING (auth.uid() = id);

-- Invoices table update (optional, to verify company_size column)
-- Ensuring company_size is text to accept new English Enum values ('Listed', 'Large', 'SMB', 'Individual')
-- If it was previously constrained, you might need to drop the constraint.
-- ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_company_size_check; 
-- ALTER TABLE invoices ADD CONSTRAINT invoices_company_size_check CHECK (company_size IN ('Listed', 'Large', 'SMB', 'Individual'));
