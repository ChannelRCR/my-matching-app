-- ==========================================
-- 1. Deals (オファー/交渉) テーブルの RLSポリシー
-- ==========================================

-- 既存の全公開ポリシーや同名ポリシーがある場合は削除
DROP POLICY IF EXISTS "Allow public access to deals" ON public.deals;
DROP POLICY IF EXISTS "Sellers can view deals for their invoices" ON public.deals;
DROP POLICY IF EXISTS "Buyers can view their own deals" ON public.deals;
DROP POLICY IF EXISTS "Buyers can insert deals" ON public.deals;
DROP POLICY IF EXISTS "Users can update their own deals" ON public.deals;

-- 売り手は自分の案件（seller_id）に対するオファー（Deals）を閲覧可能
CREATE POLICY "Sellers can view deals for their invoices"
ON public.deals
FOR SELECT
TO authenticated
USING (
  seller_id = auth.uid()
);

-- 買い手は自分が出したオファー（Deals）を閲覧可能
CREATE POLICY "Buyers can view their own deals"
ON public.deals
FOR SELECT
TO authenticated
USING (
  buyer_id = auth.uid()
);

-- 買い手は新しいオファーを作成可能
CREATE POLICY "Buyers can insert deals"
ON public.deals
FOR INSERT
TO authenticated
WITH CHECK (
  buyer_id = auth.uid()
);

-- 売り手・買い手ともに、自分の関わるDealを更新可能（ステータス変更など）
CREATE POLICY "Users can update their own deals"
ON public.deals
FOR UPDATE
TO authenticated
USING (
  seller_id = auth.uid() OR buyer_id = auth.uid()
);


-- ==========================================
-- 2. Messages (チャットルーム) テーブルの RLSポリシー
-- ==========================================

-- 既存の全公開ポリシーや同名ポリシーがある場合は削除
DROP POLICY IF EXISTS "Allow public access to messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;

-- 成約前でも、送信者または受信者が自分であればメッセージを閲覧可能
CREATE POLICY "Users can view their messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);

-- 自分が送信者となるメッセージを作成可能
CREATE POLICY "Users can insert messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
);
