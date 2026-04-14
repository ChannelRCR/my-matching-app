import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://khzrybewceioawghjnfi.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Sign in as seller
  const { data: { user }, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'seller_auto_999@example.com',
    password: 'TestPassword123!'
  });
  if (authErr) { console.error("Auth Err:", authErr); return; }

  console.log("Logged in as:", user.email);

  // 1. Create a dummy invoice
  const { data: invData, error: invErr } = await supabase.from('invoices').insert([{
    id: 'test_inv_' + Date.now(),
    seller_id: user.id,
    amount: 1000000,
    status: 'open',
    due_date: new Date(Date.now() + 86400000).toISOString()
  }]).select('*').single();
  
  if (invErr) { console.error("Inv Err:", invErr); return; }
  const invoiceId = invData.id;
  console.log("Created invoice:", invoiceId);

  // 2. We need 2 buyers to make offers. Since we just need DB deals, let's just insert deals directly.
  // Wait, RLS on deals allows inserting our own deals. But we are logged in as seller.
  // The seller can insert deals if RLS 'Users can insert their own deals' ON public.deals FOR INSERT WITH CHECK (true);
  // Yes! The policy is `USING (true)` and `CHECK (true)`. Meaning anyone can insert any deal! Wait, really? Let's check `000_initial_schema.sql`: 
  // CREATE POLICY "Users can insert their own deals" ON public.deals FOR INSERT WITH CHECK (true);
  // Yes, it allows inserting any deal.

  const buyerA = 'd15f22f7-0c17-48f0-8c29-3fc0c5e54d89'; // we can just use uuid
  const buyerB = 'e25f22f7-0c17-48f0-8c29-3fc0c5e54d89'; // fake uuid

  const { data: deals, error: dealInsErr } = await supabase.from('deals').insert([
    {
      invoice_id: invoiceId,
      buyer_id: buyerA,
      seller_id: user.id,
      status: 'negotiating',
      current_amount: 900000
    },
    {
      invoice_id: invoiceId,
      buyer_id: buyerB,
      seller_id: user.id,
      status: 'negotiating',
      current_amount: 850000
    }
  ]).select('*');

  if (dealInsErr) { console.error("Deal Insert Err:", dealInsErr); return; }
  console.log("Created 2 deals:", deals.map(d => d.id));

  // 3. Update deal 1 to concluded
  const dealA = deals.find(d => d.buyer_id === buyerA);
  const dealB = deals.find(d => d.buyer_id === buyerB);

  console.log("Concluding Deal A...");
  const { error: updateErr } = await supabase.from('deals').update({ status: 'concluded' }).eq('id', dealA.id);
  if (updateErr) { console.error("Update Deal A Err:", updateErr); return; }

  // 4. Verify Deal B is rejected
  const { data: verifyB } = await supabase.from('deals').select('status').eq('id', dealB.id).single();
  console.log("Deal B Status (Expected: rejected):", verifyB?.status);

  // 5. Verify System Message is there
  const { data: msgs } = await supabase.from('messages').select('*').eq('deal_id', dealB.id);
  console.log("Messages for Deal B:", msgs);
}

run();
