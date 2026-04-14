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
        INSERT INTO messages (id, deal_id, sender_id, receiver_id, content, is_system_message, created_at, is_read)
        SELECT 
            'sys_rej_' || gen_random_uuid()::text,
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
