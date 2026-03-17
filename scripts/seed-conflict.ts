import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.");
  console.error("Please ensure you have added SUPABASE_SERVICE_ROLE_KEY to your .env or .env.local file.");
  process.exit(1);
}

// Initialize Supabase Client with Service Role Key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Helper function to create a dummy user
async function createDummyUser(email: string, role: 'seller' | 'buyer', name: string) {
  const password = 'Password123!';
  
  // 1. Create Auth User
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    if (authError?.message.includes('already exists')) {
        console.log(`User ${email} already exists. Fetching existing...`);
        const { data: existingUser } = await supabaseAdmin.from('users').select('*').eq('email', email).single();
        return existingUser;
    }
    console.error(`Failed to create auth user for ${email}:`, authError);
    return null;
  }

  const userId = authData.user.id;

  // 2. Insert into users table
  const { error: userError } = await supabaseAdmin.from('users').insert({
    id: userId,
    email,
    name,
    company_name: `${name} Incorporated`,
    role,
    status: 'active',
  });

  if (userError) {
    console.error(`Failed to insert into users table for ${email}:`, userError);
  }

  // 3. Insert into specific role table
  if (role === 'seller') {
     await supabaseAdmin.from('sellers').insert({
        id: userId,
        representative_name: `${name} Rep`,
        entity_type: 'corporate',
        privacy_settings: {
            companyName: true,
            representativeName: true,
            contactPerson: false,
            address: false,
            bankAccountInfo: false,
            phone: false,
            email: false
        }
     });
  } else {
     await supabaseAdmin.from('buyers').insert({
        id: userId,
        representative_name: `${name} Rep`,
        entity_type: 'corporate',
        privacy_settings: {
            companyName: true,
            representativeName: true,
            contactPerson: false,
            address: false,
            bankAccountInfo: false,
            phone: false,
            email: false
        }
    });
  }

  console.log(`✅ Created dummy ${role}: ${email}`);
  return { id: userId, email, password, role };
}

async function runSeed() {
  console.log("🌱 Starting Seed Script: Conflict Condition...");

  const timestamp = Date.now();
  
  const seller = await createDummyUser(`seller_${timestamp}@example.com`, 'seller', 'Dummy Seller');
  const buyerX = await createDummyUser(`buyerx_${timestamp}@example.com`, 'buyer', 'Dummy Buyer X');
  const buyerY = await createDummyUser(`buyery_${timestamp}@example.com`, 'buyer', 'Dummy Buyer Y');

  if (!seller || !buyerX || !buyerY) {
      console.error("❌ Failed to create one or more users. Aborting...");
      process.exit(1);
  }

  console.log("📝 Generating dummy invoice...");
  const { data: invoice, error: invoiceError } = await supabaseAdmin.from('invoices').insert({
      seller_id: seller.id,
      amount: 1000000,
      selling_amount: 1000000,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days later
      debtor_name: 'Test Setup Debtor Corp',
      is_client_name_public: true,
      industry: 'IT・通信',
      company_size: 'SMB',
      status: 'open', // Initially open, will become negotiating
      debtor_entity_type: 'corporate',
      claim_type: '売掛金（商品代金）',
      company_credit: 'シードスクリプトにより自動生成された案件です。',
      requested_amount: 950000,
  }).select().single();

  if (invoiceError || !invoice) {
      console.error("❌ Failed to create invoice:", invoiceError);
      process.exit(1);
  }

  const invoiceId = invoice.id;

  console.log("🤝 Creating competitive deals (Conflict state)...");
  
  // Deal 1: Buyer X offering 900k
  const { data: deal1 } = await supabaseAdmin.from('deals').insert({
      invoice_id: invoiceId,
      buyer_id: buyerX.id,
      seller_id: seller.id,
      status: 'negotiating',
      initial_offer_amount: 900000,
      current_amount: 900000,
      current_seller_price: 950000,
      current_buyer_price: 900000,
  }).select().single();

  // Deal 2: Buyer Y offering 920k
  const { data: deal2 } = await supabaseAdmin.from('deals').insert({
      invoice_id: invoiceId,
      buyer_id: buyerY.id,
      seller_id: seller.id,
      status: 'negotiating',
      initial_offer_amount: 920000,
      current_amount: 920000,
      current_seller_price: 950000,
      current_buyer_price: 920000,
  }).select().single();

  if (deal1 && deal2) {
      // Update invoice to negotiating status
      await supabaseAdmin.from('invoices').update({ status: 'negotiating' }).eq('id', invoiceId);
      
      // Add mock messages for Deal 1
      await supabaseAdmin.from('messages').insert([
          { deal_id: deal1.id, sender_id: buyerX.id, receiver_id: seller.id, content: '90万円でいかがでしょうか？早く現金化できます。' },
          { deal_id: deal1.id, sender_id: seller.id, receiver_id: buyerX.id, content: 'ご提示ありがとうございます。95万円でお願いできませんか？' }
      ]);

      // Add mock messages for Deal 2
      await supabaseAdmin.from('messages').insert([
          { deal_id: deal2.id, sender_id: buyerY.id, receiver_id: seller.id, content: '92万円なら即決させていただきます！' },
          { deal_id: deal2.id, sender_id: seller.id, receiver_id: buyerY.id, content: '検討させていただきます。' }
      ]);
  }

  console.log("\n🎉 Seed Complete! Test Environment Ready.");
  console.log("==================================================");
  console.log(`[Seller Login]`);
  console.log(`Email:    ${seller.email}`);
  console.log(`Password: ${seller.password}`);
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  console.log(`[Buyer 1 Login]`);
  console.log(`Email:    ${buyerX.email}`);
  console.log(`Password: ${buyerX.password}`);
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  console.log(`[Buyer 2 Login]`);
  console.log(`Email:    ${buyerY.email}`);
  console.log(`Password: ${buyerY.password}`);
  console.log("==================================================");
  console.log("Use `npm run seed:conflict` anytime to generate a fresh scenario.");
}

runSeed().catch(console.error);
