-- 投げ銭（チップ）の履歴を保存するテーブル
create table if not exists public.donations (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete set null,
    deal_id uuid references public.deals(id) on delete set null,
    amount integer not null,
    stripe_session_id text not null unique,
    status text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Row Level Security) 設定
alter table public.donations enable row level security;

-- サービスロール（Webhook等のバックエンド）からの操作を許可
create policy "Service role can insert donations"
    on public.donations
    for insert
    to service_role
    with check (true);

create policy "Service role can update donations"
    on public.donations
    for update
    to service_role
    using (true);

-- ユーザーは自分の投げ銭履歴のみ参照可能
create policy "Users can view their own donations"
    on public.donations
    for select
    using (auth.uid() = user_id);
