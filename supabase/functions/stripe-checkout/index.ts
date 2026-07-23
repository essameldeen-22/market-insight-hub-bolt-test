// ============================================================================
// STRIPE CHECKOUT EDGE FUNCTION (PLACEHOLDER — NOT YET ACTIVE)
// ============================================================================
//
// This edge function creates a Stripe Checkout Session for upgrading to the
// Pro plan. It is NOT deployed yet because Stripe is not configured.
//
// WHAT A NEW OWNER NEEDS TO DO TO ACTIVATE:
//
// 1. Ensure STRIPE_SECRET_KEY is set as a Supabase secret (see stripe-webhook
//    comments for full instructions)
// 2. Create a recurring Price in your Stripe dashboard for the Pro plan
//    ($29/month), and note the price ID (price_...)
// 3. Update the PRO_PRICE_ID constant below with your real price ID
// 4. Deploy this edge function using the Supabase MCP deploy_edge_function tool
// 5. The frontend /pricing page will call this function to start checkout
//
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// PLACEHOLDER: Replace with your real Stripe Price ID after creating it in Stripe dashboard
const PRO_PRICE_ID = "price_REPLACE_WITH_YOUR_STRIPE_PRICE_ID";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // --- PLACEHOLDER: Real Stripe checkout session creation ---
    //
    // To activate:
    // 1. import Stripe from "npm:stripe@^17";
    // 2. const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
    // 3. const stripe = new Stripe(STRIPE_SECRET_KEY);
    // 4. Parse the request body to get the user's email and success/cancel URLs
    // 5. Create a checkout session:
    //    const session = await stripe.checkout.sessions.create({
    //      mode: "subscription",
    //      line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
    //      customer_email: userEmail,
    //      success_url: `${origin}/app?upgrade=success`,
    //      cancel_url: `${origin}/pricing?upgrade=cancelled`,
    //      metadata: { user_id: userId },
    //    });
    // 6. Return { url: session.url } so the frontend can redirect
    //
    // --- END PLACEHOLDER ---

    return new Response(
      JSON.stringify({
        error: "Stripe checkout not yet configured. See code comments for activation instructions.",
        proPriceId: PRO_PRICE_ID,
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
