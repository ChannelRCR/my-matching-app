import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
// Actually doing raw postgres queries is hard through supabase-js directly unless we have a function.
// Let's use psql if possible, but I don't know the DB password.
// I can just check the migration files again for deals_status_check.
