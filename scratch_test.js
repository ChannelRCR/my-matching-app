import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://khzrybewceioawghjnfi.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: { user } } = await supabase.auth.signInWithPassword({
    email: 'seller_auto_999@example.com',
    password: 'TestPassword123!'
  });

  const { data: deals } = await supabase.from('deals').select('*').eq('seller_id', user.id).limit(1);
  const deal = deals[0];

  const { error: dealErr } = await supabase.from('deals').update({
    status: 'concluded',
    seller_agreed_at: new Date().toISOString()
  }).eq('id', deal.id);
  console.log("Deal Update:", dealErr);
}
run();
