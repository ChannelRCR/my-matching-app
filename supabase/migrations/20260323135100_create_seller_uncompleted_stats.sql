-- View to efficiently fetch uncompleted deals count per seller across the platform
CREATE OR REPLACE VIEW seller_uncompleted_stats AS
SELECT
  s.id as seller_id,
  COUNT(DISTINCT i.id) as uncompleted_count
FROM sellers s
LEFT JOIN invoices i ON i.seller_id = s.id
  AND (
    i.status IN ('open', 'pending', 'negotiating')
    OR (
      i.status = 'sold'
      AND EXISTS (
        SELECT 1 FROM deals d
        WHERE d.invoice_id = i.id
          AND d.status IN ('open', 'pending', 'negotiating', 'concluded', 'agreed')
          AND (d.payment_status IS NULL OR d.payment_status != 'fully_settled')
      )
    )
  )
GROUP BY s.id;

-- Ensure anyone can read it
GRANT SELECT ON seller_uncompleted_stats TO authenticated;
GRANT SELECT ON seller_uncompleted_stats TO anon;
