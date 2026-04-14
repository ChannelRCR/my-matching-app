-- 000_initial_schema.sql
-- Missing initial schema creation

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    company_name TEXT,
    role TEXT CHECK (role IN ('seller', 'buyer', 'admin')),
    avatar_url TEXT,
    budget TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own user record" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own user record" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 2. invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC,
    selling_amount NUMERIC,
    due_date DATE,
    debtor_name TEXT,
    debtor_address TEXT,
    is_client_name_public BOOLEAN DEFAULT false,
    is_client_address_public BOOLEAN DEFAULT false,
    debtor_entity_type TEXT DEFAULT 'corporate',
    debtor_postal_code TEXT,
    industry TEXT,
    industry_other TEXT,
    sale_type TEXT DEFAULT 'full',
    company_size TEXT,
    company_credit TEXT,
    claim_type TEXT,
    claim_type_other TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'negotiating', 'pending', 'sold', 'withdrawn')),
    requested_amount NUMERIC,
    evidence_url TEXT,
    evidence_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public invoices are viewable by everyone" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Users can insert their own invoice" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Users can update their own invoice" ON public.invoices FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Users can delete their own invoice" ON public.invoices FOR DELETE USING (auth.uid() = seller_id);

-- 3. deals table
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id TEXT REFERENCES public.invoices(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'open',
    initial_offer_amount NUMERIC,
    current_amount NUMERIC,
    current_seller_price NUMERIC,
    current_buyer_price NUMERIC,
    seller_agreed_at TIMESTAMP WITH TIME ZONE,
    buyer_agreed_at TIMESTAMP WITH TIME ZONE,
    contract_date TIMESTAMP WITH TIME ZONE,
    seller_revealed_fields JSONB DEFAULT '{}'::jsonb,
    buyer_revealed_fields JSONB DEFAULT '{}'::jsonb,
    payment_status TEXT DEFAULT 'pending',
    is_disputed BOOLEAN DEFAULT false,
    contract_url TEXT,
    settlement_url TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users and admins can view their deals" ON public.deals FOR SELECT USING (true);
CREATE POLICY "Users can insert their own deals" ON public.deals FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own deals" ON public.deals FOR UPDATE USING (true);

-- 4. messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id TEXT PRIMARY KEY,
    deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
    invoice_id TEXT REFERENCES public.invoices(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    file_url TEXT,
    file_name TEXT,
    file_type TEXT,
    is_read BOOLEAN DEFAULT false,
    is_system_message BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Users can insert their messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their messages" ON public.messages FOR UPDATE USING (true);

-- 5. disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    dispute_type TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    claim_amount NUMERIC,
    settlement_amount NUMERIC,
    installments_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view disputes" ON public.disputes FOR SELECT USING (true);
CREATE POLICY "Users can insert disputes" ON public.disputes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update disputes" ON public.disputes FOR UPDATE USING (true);
