import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkOrUser(email, role, name) {
    const { data: usersData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    let user = usersData?.users?.find(u => u.email === email);
    
    if (!user) {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: 'TestPassword123!',
            email_confirm: true,
            user_metadata: { role }
        });
        if (error) throw error;
        user = data.user;
        console.log("Created user:", email);
        
        // Ensure profile is correctly set up
        const { error: profileErr } = await supabaseAdmin.from('users').upsert({
            id: user.id,
            email: email,
            name: name,
            company_name: name + ' Inc.',
            role: role,
            status: 'active'
        });
        if (profileErr) console.error("Profile setup err", profileErr);
    } else {
        console.log("User already exists:", email);
        // FORCE email confirmation if missing
        if (!user.email_confirmed_at) {
            await supabaseAdmin.auth.admin.updateUserById(user.id, { email_confirm: true });
            console.log("Forced email confirmation for", email);
        }
    }
    return user;
}

async function run() {
    try {
        const seller = await checkOrUser('test_s_multi@example.com', 'seller', 'Seller S');
        const buyerA = await checkOrUser('test_a_multi@example.com', 'buyer', 'Buyer A');
        const buyerB = await checkOrUser('test_b_multi@example.com', 'buyer', 'Buyer B');
        console.log("Users are ready!");
    } catch(e) {
        console.error(e);
    }
}
run();
