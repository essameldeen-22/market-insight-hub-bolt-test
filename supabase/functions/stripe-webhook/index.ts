// ============================================================================
// STRIPE WEBHOOK EDGE FUNCTION (PLACEHOLDER — NOT YET ACTIVE)
// ============================================================================
//
// This edge function is a well-commented placeholder for handling Stripe
// webhook events. It is NOT deployed yet because Stripe is not configured.
//
// WHAT A NEW OWNER NEEDS TO DO TO ACTIVATE REAL PAYMENTS:
//
// 1. Create a Stripe account at https://dashboard.stripe.com/register
// 2. Get your Stripe secret key from Developers > API Keys
// 3. Add the secret key to the project's secrets via:
//    - The Supabase dashboard: Project Settings > Edge Functions > Secrets
//    - Add a secret named STRIPE_SECRET_KEY with your sk_live_... or sk_test_... value
// 4. Deploy this edge function using the Supabase MCP deploy_edge_function tool
//    (or the Supabase dashboard)
// 5. In your Stripe dashboard, go to Developers > Webhooks > Add endpoint
//    - Set the endpoint URL to:
//      https://<your-supabase-project-ref>.supabase.co/functions/v1/stripe-webhook
//    - Subscribe to these events:
//      checkout.session.completed
//      customer.subscription.updated
//      customer.subscription.deleted
//    - Copy the signing secret (whsec_...) and add it as a Supabase secret
//      named STRIPE_WEBHOOK_SECRET
// 6. Uncomment the real logic below and deploy
//
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // --- PLACEHOLDER: Real Stripe webhook verification ---
    //
    // To activate, you need:
    //   const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
    //   const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
    //   const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    //   const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    //
    // Then:
    // 1. Verify the webhook signature using Stripe's library:
    //    import Stripe from "npm:stripe@^17";
    //    const stripe = new Stripe(STRIPE_SECRET_KEY);
    //    const sig = req.headers.get("stripe-signature")!;
    //    const event = await stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
    //
    // 2. Handle events:
    //    case "checkout.session.completed":
    //      -> Look up the user by stripe_customer_id
    //      -> Set profiles.is_pro = true
    //      -> Insert/update pro_subscriptions row
    //
    //    case "customer.subscription.deleted":
    //      -> Set profiles.is_pro = false
    //      -> Update pro_subscriptions status to 'canceled'
    //
    // 3. Use the service role client (bypasses RLS) to write to the database:
    //    import { createClient } from "npm:@supabase/supabase-js@^2";
    //    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    //
    // --- END PLACEHOLDER ---

    return new Response(
      JSON.stringify({ received: true, message: "Stripe webhook placeholder — not yet active. See code comments for activation instructions." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
