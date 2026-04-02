-- 025 Force Fix Deal Trigger
-- Replaces the buggy handle_deal_concluded function that referenced updated_at.
-- This version uses a CTE (Common Table Expression) to atomically update and insert, completely avoiding timestamp tracking.

CREATE OR REPLACE FUNCTION handle_deal_concluded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the deal status has just changed to 'concluded'
    IF NEW.status = 'concluded' AND OLD.status != 'concluded' THEN
        
        -- Reject all other active deals for the same invoice, and immediately insert system messages
        WITH rejected_deals AS (
            UPDATE deals 
            SET status = 'rejected', last_message_at = NOW()
            WHERE invoice_id = NEW.invoice_id 
              AND id != NEW.id 
              AND status IN ('open', 'pending', 'negotiating')
            RETURNING id, seller_id, buyer_id
        )
        INSERT INTO messages (deal_id, sender_id, receiver_id, content, is_system_message, timestamp, is_read)
        SELECT 
            id,
            seller_id,
            buyer_id,
            '【システム】この案件は他のお客様と成約したため、自動的に交渉が終了しました。',
            true,
            NOW(),
            false
        FROM rejected_deals;
        
        -- Mark the invoice as sold
        UPDATE invoices
        SET status = 'sold'
        WHERE id = NEW.invoice_id AND status != 'sold';
        
    END IF;
    RETURN NEW;
END;
$$;
