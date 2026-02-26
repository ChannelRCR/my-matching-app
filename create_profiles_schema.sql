-- 1. Create Sellers Table
CREATE TABLE public.sellers (
    id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trade_name text,
    representative_name text,
    contact_person text,
    address text,
    bank_account_info text,
    phone_number text,
    email_address text,
    privacy_settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT sellers_pkey PRIMARY KEY (id)
);

-- 2. Create Buyers Table
CREATE TABLE public.buyers (
    id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trade_name text,
    representative_name text,
    contact_person text,
    address text,
    phone_number text,
    email_address text,
    privacy_settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT buyers_pkey PRIMARY KEY (id)
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (MVP: Allow public access for now)
DROP POLICY IF EXISTS "Allow public access to sellers" ON public.sellers;
CREATE POLICY "Allow public access to sellers"
ON public.sellers FOR ALL
TO public
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to buyers" ON public.buyers;
CREATE POLICY "Allow public access to buyers"
ON public.buyers FOR ALL
TO public
USING (true)
WITH CHECK (true);
