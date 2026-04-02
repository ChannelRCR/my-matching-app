-- Temporarily drop webhook triggers to prevent 500 Internal Server Errors
-- when sending messages or updating deals, as the external 'pg_net' endpoint
-- is not yet fully configured in the local/remote environment.

DROP TRIGGER IF EXISTS "send_message_email_trigger" ON "public"."messages";
DROP TRIGGER IF EXISTS "send_deal_email_trigger" ON "public"."deals";

-- Also force the schema cache to reload just in case
NOTIFY pgrst, 'reload schema';
