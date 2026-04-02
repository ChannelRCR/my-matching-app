-- 支払い履歴を保存するテーブル
create table if not exists public.system_payments (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete set null,
    amount integer not null,
    stripe_session_id text not null unique,
    status text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Row Level Security) 設定
alter table public.system_payments enable row level security;

-- サービスロール（Webhook等のバックエンド）からの操作を許可
create policy "Service role can insert system payments"
    on public.system_payments
    for insert
    to service_role
    with check (true);

create policy "Service role can update system payments"
    on public.system_payments
    for update
    to service_role
    using (true);

-- ユーザーは自分の支払い履歴のみ参照可能
create policy "Users can view their own system payments"
    on public.system_payments
    for select
    using (auth.uid() = user_id);
