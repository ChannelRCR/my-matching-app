-- Migration: Create a secure view for unauthenticated users to see open invoices with masked data
-- File: supabase/migrations/20260421131000_create_public_open_invoices_view.sql

CREATE OR REPLACE VIEW public_open_invoices_view AS
SELECT
    i.id,
    -- Amount masking: Truncate to nearest 100k
    -- If amount is 1,250,000 -> 1,200,000
    FLOOR(i.amount / 100000) * 100000 AS masked_amount,
    FLOOR(i.selling_amount / 100000) * 100000 AS masked_selling_amount,
    i.due_date,
    i.claim_type,
    i.industry AS debtor_industry,
    i.company_size AS debtor_company_size,
    -- Extract prefecture from seller's address
    COALESCE(
        substring(s.address from '^[^都道府県]*[都道府県]'),
        '地域非公開'
    ) AS seller_region,
    COALESCE(s.industry, '業種非公開') AS seller_industry,
    i.status,
    i.created_at
FROM
    invoices i
LEFT JOIN
    sellers s ON i.seller_id = s.id
WHERE
    i.status IN ('open', 'pending', 'negotiating');

-- Grant read access to anon and authenticated roles
GRANT SELECT ON public_open_invoices_view TO anon, authenticated;
