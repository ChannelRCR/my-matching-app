import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
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

        const targetEmails: string[] = [];
        for (const uid of targetUserIds) {
            const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(uid);
            if (!userError && user?.email) {
                targetEmails.push(user.email);
            } else {
                console.warn(`Failed to fetch user email for ID ${uid}. Error: ${userError?.message}`);
            }
        }

        if (targetEmails.length === 0) {
             throw new Error("Could not resolve any emails from targetUserIds");
        }

        console.log(`Recipient emails resolved: ${targetEmails.join(', ')}`);

        const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "FactorMatch <onboarding@resend.dev>",
                to: targetEmails, // Array of dynamic emails
                subject: subject,
                html: messageHtml,
            }),
        });

        if (!emailResponse.ok) {
            const errorText = await emailResponse.text();

            // Auto fallback for unverified sandbox emails
            if (emailResponse.status === 403 && !targetEmails.includes("info@nipponrcr.com")) {
                console.warn(`Resend Sandbox restriction hit for ${targetEmails.join(', ')}. Falling back to default test email (info@nipponrcr.com)...`);

                const fallbackResponse = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${RESEND_API_KEY}`,
                    },
                    body: JSON.stringify({
                        from: "FactorMatch <onboarding@resend.dev>",
                        to: ["info@nipponrcr.com"],
                        subject: `[TEST FOR ${targetEmails.join(', ')}] ` + subject,
                        html: messageHtml,
                    }),
                });

                if (fallbackResponse.ok) {
                    const fallbackResult = await fallbackResponse.json();
                    console.log("Fallback email sent successfully:", fallbackResult.id);
                    return new Response(JSON.stringify(fallbackResult), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }
            }

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
