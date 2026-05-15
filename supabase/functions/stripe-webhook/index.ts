import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.10.0';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
});

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') as string;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') as string,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
);

serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  // Stripe Webhook requires the raw string body to verify the signature
  const body = await req.text();
  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`Webhook signature verification failed: ${errorMsg}`);
    return new Response(`Webhook Error: ${errorMsg}`, { status: 400 });
  }

  try {
    // Handling completed sessions
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const stripe_session_id = session.id;
      const amount = session.amount_total;
      const status = session.payment_status;
      // Extract user_id from metadata or client_reference_id
      const user_id = session.metadata?.user_id || session.client_reference_id;
      const deal_id = session.metadata?.deal_id || null;

      if (status === 'paid' && stripe_session_id) {
        const { error } = await supabase
          .from('donations')
          .upsert({
            stripe_session_id,
            user_id: user_id === 'guest' ? null : user_id,
            deal_id,
            amount,
            status: 'succeeded'
          }, { onConflict: 'stripe_session_id' });

        if (error) {
          console.error('Error inserting system payment:', error);
          throw error;
        }
        console.log(`Successfully recorded payment ${stripe_session_id} for user ${user_id}`);

        // Send thank you email / receipt
        const email = session.customer_details?.email;
        const targetEmails = email ? [email] : [];
        const targetUserIds = user_id && user_id !== 'guest' ? [user_id] : [];

        if (targetEmails.length > 0 || targetUserIds.length > 0) {
          const formattedAmount = new Intl.NumberFormat('ja-JP').format(amount || 0);
          const formattedDate = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
          
          const messageHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <h2 style="color: #e11d48; border-bottom: 2px solid #ffe4e6; padding-bottom: 10px;">ご支援ありがとうございました🎉</h2>
              <p>この度は、FactorMatchの運営へ温かいご支援を賜り、誠にありがとうございます。</p>
              <p>以下の内容で決済（投げ銭）が完了いたしましたので、領収書としてお知らせいたします。</p>
              <br/>
              <table style="border-collapse: collapse; width: 100%; max-width: 400px; background-color: #f8fafc; border-radius: 8px; overflow: hidden;">
                <tr>
                  <th style="text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; width: 40%;">寄付金額</th>
                  <td style="text-align: right; padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; font-size: 1.1em;">${formattedAmount} 円</td>
                </tr>
                <tr>
                  <th style="text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0;">決済完了日時</th>
                  <td style="text-align: right; padding: 12px; border-bottom: 1px solid #e2e8f0;">${formattedDate}</td>
                </tr>
              </table>
              <br/>
              <p>いただいたご支援は、本プラットフォームのサービス維持および機能向上のために大切に活用させていただきます。</p>
              <p>引き続き、FactorMatchをよろしくお願い申し上げます。</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="font-size: 0.8em; color: #666; text-align: center;">※本メールは送信専用です。</p>
            </div>
          `;

          const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          const supabaseUrl = Deno.env.get('SUPABASE_URL');

          if (!serviceKey || !supabaseUrl) {
            throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL environment variables.');
          }

          const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceKey}`
            },
            body: JSON.stringify({
              type: 'custom',
              targetUserIds,
              targetEmails,
              subject: '【FactorMatch】ご支援（投げ銭）の領収書と御礼',
              messageHtml
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to send thank you email:', response.status, errorText);
          } else {
            console.log('Thank you email sent successfully.');
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`Webhook handler error: ${errorMsg}`);
    return new Response(`Webhook handler error`, { status: 500 });
  }
});
