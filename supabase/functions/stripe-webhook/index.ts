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
