-- Migration: Update invoice_offer_stats view to accurately reflect max offers including negotiations

CREATE OR REPLACE VIEW invoice_offer_stats AS
SELECT 
    invoice_id,
    COUNT(id) as offer_count,
    MAX(
        CASE 
            WHEN status IN ('open', 'pending', 'negotiating') 
            THEN GREATEST(
                COALESCE(current_buyer_price, 0),
                COALESCE(current_amount, 0),
                COALESCE(initial_offer_amount, 0)
            )
            ELSE 0 
        END
    ) as max_offer
FROM deals
WHERE status IN ('open', 'pending', 'negotiating')
GROUP BY invoice_id;

-- Grant read access to authenticated and anon users
GRANT SELECT ON invoice_offer_stats TO anon, authenticated;
