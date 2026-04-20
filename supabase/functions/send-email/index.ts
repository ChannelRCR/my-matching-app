import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// We fetch environment variables inside the handler to provide better runtime error logs.
// Delaying client initialization if variables are missing prevents module-level crashes.
// Edge functions restart on new deployments, so fetching env at request is safe for debugging.

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log("--- New Email Request Received ---");

        if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            console.error("CRITICAL: Missing environment variables.");
            console.error(`RESEND_API_KEY exists: ${!!RESEND_API_KEY}`);
            console.error(`SUPABASE_URL exists: ${!!SUPABASE_URL}`);
            console.error(`SUPABASE_SERVICE_ROLE_KEY exists: ${!!SUPABASE_SERVICE_ROLE_KEY}`);
            throw new Error("Missing required environment variables for email function.");
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const payload = await req.json();
        
        // Webhookベースの送信ロジックはスキップ・無効化し、手動通知のみ処理
        if (payload.type !== "custom") {
             console.log(`Skipping non-custom email trigger: ${payload.type} on ${payload.table}`);
             return new Response(JSON.stringify({ message: "Webhook triggers are disabled. Only type='custom' is supported." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { targetUserIds, subject, messageHtml } = payload;

        console.log(`Processing custom email to userIds: ${targetUserIds?.join(', ')}`);

        if (!targetUserIds || targetUserIds.length === 0 || !subject) {
            console.log("No valid targetUserIds or subject generated. Skipping email.");
            return new Response(JSON.stringify({ message: "No email triggered. Missing fields." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const rawEmails: string[] = [];
        for (const uid of targetUserIds) {
            const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(uid);
            if (!userError && user?.email) {
                rawEmails.push(user.email);
            } else {
                console.warn(`Failed to fetch user email for ID ${uid}. Error: ${userError?.message}`);
            }
        }

        // 1. 宛先メールアドレスの厳密なフィルタリング
        const validEmails = rawEmails.filter(email => typeof email === 'string' && email.includes('@'));

        if (validEmails.length === 0) {
             throw new Error("Could not resolve any valid emails from targetUserIds. No emails to send.");
        }

        const finalToEmails = validEmails;
        console.log(`Recipient emails resolved: ${finalToEmails.join(', ')}`);

        const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "FactorMatch <onboarding@resend.dev>",
                to: finalToEmails, // Array of dynamic emails
                subject: subject,
                html: messageHtml,
            }),
        });

        if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            // In production, no fallback is allowed. Sandbox restrictions will hard fail here.
            throw new Error(`Resend API Error: ${errorText}`);
        }

        const emailResult = await emailResponse.json();
        console.log("Email sent successfully:", emailResult.id);
        return new Response(JSON.stringify(emailResult), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (err: unknown) {
        console.error("Error sending email:", err);
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500, headers: corsHeaders });
    }
});
