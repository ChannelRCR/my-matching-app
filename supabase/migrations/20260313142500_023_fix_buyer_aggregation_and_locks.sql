-- Migration: Create invoice_offer_stats view for offer aggregation and implement deal exclusive lock trigger

-- 1. Create a view to aggregate offers and max pricing for each invoice
-- This bypasses the RLS on deals intentionally to provide aggregated data without exposing buyer identities.
CREATE OR REPLACE VIEW invoice_offer_stats AS
SELECT 
    invoice_id,
    COUNT(id) as offer_count,
    MAX(
        CASE 
            WHEN status IN ('open', 'pending', 'negotiating') 
            THEN COALESCE(current_buyer_price, initial_offer_amount, 0)
            ELSE 0 
        END
    ) as max_offer
FROM deals
WHERE status IN ('open', 'pending', 'negotiating')
GROUP BY invoice_id;

-- Grant read access to authenticated and anon users
GRANT SELECT ON invoice_offer_stats TO anon, authenticated;

-- 2. Create a trigger function to handle exclusive locking when a deal is concluded
CREATE OR REPLACE FUNCTION handle_deal_concluded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the deal status has just changed to 'concluded'
    IF NEW.status = 'concluded' AND OLD.status != 'concluded' THEN
        
        -- Reject all other active deals for the same invoice
        UPDATE deals 
        SET status = 'rejected', updated_at = NOW()
        WHERE invoice_id = NEW.invoice_id 
          AND id != NEW.id 
          AND status IN ('open', 'pending', 'negotiating');

        -- Insert a system message for each newly rejected deal to inform the buyer
        INSERT INTO messages (deal_id, sender_id, receiver_id, content, is_system_message, timestamp, is_read)
        SELECT 
            d.id,
            d.seller_id,
            d.buyer_id,
            '【システム】この案件は他のお客様と成約したため、自動的に交渉が終了しました。',
            true,
            NOW(),
            false
        FROM deals d
        WHERE d.invoice_id = NEW.invoice_id 
          AND d.id != NEW.id 
          AND d.status = 'rejected'
          AND d.updated_at >= NOW() - INTERVAL '1 minute';
        
        -- Mark the invoice as sold
        UPDATE invoices
        SET status = 'sold', updated_at = NOW()
        WHERE id = NEW.invoice_id AND status != 'sold';
        
    END IF;
    RETURN NEW;
END;
$$;

-- Attach the trigger to the deals table
DROP TRIGGER IF EXISTS trigger_deal_concluded ON deals;
CREATE TRIGGER trigger_deal_concluded
AFTER UPDATE OF status ON deals
FOR EACH ROW
EXECUTE FUNCTION handle_deal_concluded();
