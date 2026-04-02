-- users テーブルに email カラムを追加
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;

-- buyers テーブルに bank_account_info カラムを追加
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS bank_account_info text;
