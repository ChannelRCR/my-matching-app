CREATE TABLE contract_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('buyer', 'seller')),
    signature_name TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    agreed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS policies
ALTER TABLE contract_logs ENABLE ROW LEVEL SECURITY;

-- Select policy: users can see logs for deals they are a part of
CREATE POLICY "Users can view contract logs for their deals" 
ON contract_logs FOR SELECT 
USING (
    deal_id IN (
        SELECT id FROM deals 
        WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
);

-- Insert policy: users can insert logs for deals they are a part of
CREATE POLICY "Users can insert contract logs for their deals" 
ON contract_logs FOR INSERT 
WITH CHECK (
    user_id = auth.uid() AND
    deal_id IN (
        SELECT id FROM deals 
        WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
);
