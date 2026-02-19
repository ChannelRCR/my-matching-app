-- Supabase Schema for Receivables Matching Platform
-- Based on types.ts and MVP requirements

-- 1. Users Table (Sellers & Buyers)
create table public.users (
  id uuid not null default gen_random_uuid(),
  name text not null,
  company_name text not null,
  role text not null check (role in ('seller', 'buyer', 'admin')),
  avatar_url text,
  budget text, -- For buyers
  appeal_point text, -- For buyers
  status text check (status in ('active', 'suspended')) default 'active',
  registered_at timestamp with time zone default timezone('utc'::text, now()),
  
  constraint users_pkey primary key (id)
);

-- 2. Invoices Table (Receivables)
create table public.invoices (
  id uuid not null default gen_random_uuid(),
  seller_id uuid not null references public.users(id),
  amount numeric not null,
  due_date date not null,
  industry text not null,
  company_size text,
  company_credit text, -- Credit info/notes
  status text not null check (status in ('open', 'negotiating', 'sold')) default 'open',
  requested_amount numeric,
  evidence_url text,
  evidence_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  
  constraint invoices_pkey primary key (id)
);

-- 3. Deals Table (Negotiations)
create table public.deals (
  id uuid not null default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id),
  buyer_id uuid not null references public.users(id),
  seller_id uuid not null references public.users(id),
  status text not null check (status in ('negotiating', 'agreed', 'rejected')) default 'negotiating',
  initial_offer_amount numeric not null,
  current_amount numeric not null,
  started_at timestamp with time zone default timezone('utc'::text, now()),
  last_message_at timestamp with time zone default timezone('utc'::text, now()),
  
  constraint deals_pkey primary key (id)
);

-- 4. Messages Table (Chat)
create table public.messages (
  id uuid not null default gen_random_uuid(),
  deal_id uuid not null references public.deals(id),
  sender_id uuid not null references public.users(id),
  receiver_id uuid not null references public.users(id),
  content text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()),
  
  constraint messages_pkey primary key (id)
);

-- 5. Row Level Security (RLS) Setup
-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.invoices enable row level security;
alter table public.deals enable row level security;
alter table public.messages enable row level security;

-- 6. RLS Policies (MVP: Public Access for Prototype)
-- WARNING: These policies allow ANYONE to read/write EVERYTHING.
-- STRICTLY FOR PROTOTYPING ONLY.

-- Users
create policy "Allow public access to users"
on public.users for all
to public
using (true)
with check (true);

-- Invoices
create policy "Allow public access to invoices"
on public.invoices for all
to public
using (true)
with check (true);

-- Deals
create policy "Allow public access to deals"
on public.deals for all
to public
using (true)
with check (true);

-- Messages
create policy "Allow public access to messages"
on public.messages for all
to public
using (true)
with check (true);

-- 7. Realtime Setup (Optional but recommended for chat)
-- Enable realtime for messages and deals
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.deals;
