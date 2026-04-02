-- Migration: Fix deal concluded trigger
-- The previous trigger referenced a non-existent `updated_at` column in both `deals` and `invoices` tables.
-- This caused HTTP 400 Bad Request (PostgreSQL 42703 column does not exist) errors when concluding a deal via Supabase REST API.
-- We are replacing `updated_at` with `last_message_at` for `deals` to find recently rejected deals, and removing `updated_at` from `invoices治安`.

CREATE OR REPLACE FUNCTION handle_deal_concluded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the deal status has just changed to 'concluded'
    IF NEW.status = 'concluded' AND OLD.status != 'concluded' THEN
        
        -- Reject all other active deals for the same invoice, record the time via last_message_at
        UPDATE deals 
        SET status = 'rejected', last_message_at = NOW()
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
          AND d.last_message_at >= NOW() - INTERVAL '1 minute';
        
        -- Mark the invoice as sold (removed non-existent updated_at column)
        UPDATE invoices
        SET status = 'sold'
        WHERE id = NEW.invoice_id AND status != 'sold';
        
    END IF;
    RETURN NEW;
END;
$$;
