import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.10.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Received payload:", payload);
    const { amount, success_url, cancel_url, user_id, deal_id } = payload;

    if (!amount || typeof amount !== 'number' || amount < 500) {
      throw new Error("Amount must be at least 500 JPY");
    }

    if (!success_url || !cancel_url) {
      throw new Error("success_url and cancel_url are required");
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'paypay'],
      client_reference_id: user_id || undefined,
      metadata: {
        user_id: user_id || 'guest',
        deal_id: deal_id || null,
      },
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: 'FactorMatch 運営へのサポート（投げ銭）',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: success_url.includes('?') ? `${success_url}&donation_success=true` : `${success_url}?donation_success=true`,
      cancel_url: cancel_url,
    });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (err: unknown) {
    console.error("Stripe session creation error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
