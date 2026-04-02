-- Migration: Create public deals view for anon access on Landing Page

-- This view safely exposes contracted/completed deal data 
-- without any sensitive debtor/invoice specifics, 
-- masking the buyer name based on privacy settings.
CREATE OR REPLACE VIEW public_deals_view AS
SELECT
    d.id,
    d.status,
    d.payment_status,
    i.amount AS invoice_amount,
    COALESCE(d.current_amount, i.amount) AS current_amount,
    s.company_name AS seller_name,
    CASE 
        WHEN COALESCE((b.privacy_settings->>'companyName')::boolean, true) = true THEN b.company_name
        ELSE '非公開の投資家'
    END AS buyer_name,
    d.started_at,
    d.last_message_at,
    COALESCE(d.last_message_at, d.started_at) AS updated_at
FROM
    deals d
LEFT JOIN
    invoices i ON d.invoice_id = i.id
LEFT JOIN
    sellers s ON d.seller_id = s.id
LEFT JOIN
    buyers b ON d.buyer_id = b.id
WHERE
    d.status IN ('contract_agreed', 'settlement_pending', 'repayment_pending', 'agreed', 'concluded')
    OR d.payment_status IN ('seller_received', 'seller_repaid', 'fully_settled');

-- Grant read access to anon and authenticated roles
GRANT SELECT ON public_deals_view TO anon, authenticated;
