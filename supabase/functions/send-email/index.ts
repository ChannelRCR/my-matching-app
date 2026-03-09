import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

serve(async (req) => {
    try {
        const payload = await req.json();
        const { type, table, record, old_record } = payload;
        let targetUserId = "";
        let subject = "";
        let messageHtml = "";

        console.log(`Processing Webhook: ${type} on ${table}`);

        if (table === "messages" && type === "INSERT") {
            targetUserId = record.receiver_id;

            const { data: sender } = await supabase.from('users').select('name').eq('id', record.sender_id).single();
            const senderName = sender?.name || "ユーザー";

            subject = "新着メッセージのお知らせ [FactorMatch]";
            messageHtml = `<p>${senderName} 様から新しいメッセージが届いています。</p><p>FactorMatchのチャット画面よりご確認ください。</p>`;
        }
        else if (table === "deals" && type === "UPDATE") {
            const oldStatus = old_record?.status || "unknown";
            const newStatus = record.status;
            const oldPayment = old_record?.payment_status || "unknown";
            const newPayment = record.payment_status;

            console.log(`Evaluating deal update - Status: ${oldStatus} -> ${newStatus}, Payment: ${oldPayment} -> ${newPayment}`);

            // 契約合意
            if (record.status === "concluded" && old_record.status !== "concluded") {
                targetUserId = record.buyer_id;
                subject = "契約が締結されました [FactorMatch]";
                messageHtml = `<p>対象案件の契約が締結（成約）されました。</p><p>速やかに決済手続きへ進み、ダッシュボードから相手方の口座へ送金を行ってください。</p>`;
            }
            // 買い手が入金報告
            else if (record.payment_status === "paid" && old_record.payment_status !== "paid") {
                targetUserId = record.seller_id;
                subject = "入金報告のお知らせ [FactorMatch]";
                messageHtml = `<p>買い手（譲受人）から入金完了の報告がありました。</p><p>口座の着金をご確認のうえ、ダッシュボードで受取確認ボタンを押して取引を完了させてください。</p>`;
            }
            // 売り手が着金確認 (完了)
            else if (record.payment_status === "completed" && old_record.payment_status !== "completed") {
                targetUserId = record.buyer_id;
                subject = "取引完了のお知らせ [FactorMatch]";
                messageHtml = `<p>売り手（譲渡人）が着金を確認し、取引プロセスがすべて完了いたしました。</p><p>FactorMatchをご利用いただき誠にありがとうございます。</p>`;
            } else {
                console.log("Deal updated, but no actionable status/payment_status change detected.");
            }
        }

        console.log(`Resolved targetUserId: ${targetUserId} from event`);

        if (!targetUserId || !subject) {
            console.log("No valid targetUserId or subject generated. Skipping email.");
            return new Response(JSON.stringify({ message: "No email triggered for this event." }), { headers: { "Content-Type": "application/json" } });
        }

        // Fetch user email using admin auth API
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(targetUserId);
        if (userError || !user?.email) {
            throw new Error(`Failed to fetch user email for ID ${targetUserId}. Error: ${userError?.message}`);
        }

        console.log(`Recipient email resolved: ${user.email} (User ID: ${targetUserId})`);

        // IMPORTANT NOTE FOR RESEND SANDBOX:
        // By default, Resend only allows sending to your own verified email address.
        // We will send to user.email, but if it fails with 403, we will fall back to a hardcoded email for testing purposes.
        const targetEmail = user.email;

        console.log(`Sending email to ${targetEmail}...`);

        const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "FactorMatch <onboarding@resend.dev>",
                to: [targetEmail], // Real dynamic email
                subject: subject,
                html: messageHtml,
            }),
        });

        if (!emailResponse.ok) {
            const errorText = await emailResponse.text();

            // Auto fallback for unverified sandbox emails
            if (emailResponse.status === 403 && targetEmail !== "info@nipponrcr.com") {
                console.warn(`Resend Sandbox restriction hit for ${targetEmail}. Falling back to default test email (info@nipponrcr.com)...`);

                const fallbackResponse = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${RESEND_API_KEY}`,
                    },
                    body: JSON.stringify({
                        from: "FactorMatch <onboarding@resend.dev>",
                        to: ["info@nipponrcr.com"],
                        subject: `[TEST FOR ${targetEmail}] ` + subject,
                        html: messageHtml,
                    }),
                });

                if (fallbackResponse.ok) {
                    const fallbackResult = await fallbackResponse.json();
                    console.log("Fallback email sent successfully:", fallbackResult.id);
                    return new Response(JSON.stringify(fallbackResult), { headers: { "Content-Type": "application/json" } });
                }
            }

            throw new Error(`Resend API Error: ${errorText}`);
        }

        const emailResult = await emailResponse.json();
        console.log("Email sent successfully:", emailResult.id);
        return new Response(JSON.stringify(emailResult), { headers: { "Content-Type": "application/json" } });

    } catch (err: any) {
        console.error("Error sending email:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
