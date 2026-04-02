-- Migration to update payment_status in deals table for two-party factoring flow
-- (DML UPDATE statements removed to prevent webhook triggering and OOM)

-- Add a comment explaining states: pending, buyer_paid, seller_received, seller_repaid, fully_settled
COMMENT ON COLUMN deals.payment_status IS 'Tracks the payment status of concluded deals: pending (waiting for payment), buyer_paid (buyer reported payment), seller_received (seller confirmed receipt), seller_repaid (seller collected from debtor and repaid buyer), fully_settled (buyer confirmed receipt of repayment).';
