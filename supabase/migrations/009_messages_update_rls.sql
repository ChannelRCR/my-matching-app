-- 1. ユーザーが自分宛てのメッセージの `is_read` を `true` に更新できるようにするRLSポリシー
CREATE POLICY "Receivers can update message read status" ON public.messages
FOR UPDATE TO authenticated
USING (receiver_id = auth.uid())
WITH CHECK (receiver_id = auth.uid());
