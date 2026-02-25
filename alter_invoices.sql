-- 案件（売掛金）の一部売却機能の実装に伴うカラム追加
ALTER TABLE public.invoices ADD COLUMN selling_amount numeric;
