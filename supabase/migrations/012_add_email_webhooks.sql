-- This migration provides the SQL to set up Database Webhooks using the supabase_functions.http_request wrapper.
--
-- 💡 IMPORTANT NOTE BEFORE RUNNING:
-- Please replace the two placeholders in the code below with your actual project details:
-- 1. [YOUR_SUPABASE_PROJECT_URL] => e.g., https://abcdefghijklm.supabase.co
-- 2. [YOUR_ANON_KEY] => e.g., eyJhbGciOiJIUzI1NiIsInR5c...
--
-- Alternatively, you can easily create these Webhooks via the Supabase Dashboard UI!
-- Navigate to: Database -> Webhooks -> Create Webhook, and set them to POST to your Edge Function URL.

-- Enable pg_net extension if not present
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- 1. Webhook for NEW MESSAGES (INSERT)
CREATE OR REPLACE TRIGGER "send_message_email_trigger"
  AFTER INSERT ON "public"."messages"
  FOR EACH ROW
  EXECUTE FUNCTION "supabase_functions"."http_request"(
    '[YOUR_SUPABASE_PROJECT_URL]/functions/v1/send-email', 
    'POST',
    '{"Content-Type":"application/json", "Authorization":"Bearer [YOUR_ANON_KEY]"}', 
    '{}',
    '1000'
  );

-- 2. Webhook for DEALS UPDATES (STATUS / PAYMENT)
CREATE OR REPLACE TRIGGER "send_deal_email_trigger"
  AFTER UPDATE ON "public"."deals"
  FOR EACH ROW
  -- Optimize triggering to only run when status or payment_status actually changes
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION "supabase_functions"."http_request"(
    '[YOUR_SUPABASE_PROJECT_URL]/functions/v1/send-email', 
    'POST',
    '{"Content-Type":"application/json", "Authorization":"Bearer [YOUR_ANON_KEY]"}', 
    '{}',
    '1000'
  );
