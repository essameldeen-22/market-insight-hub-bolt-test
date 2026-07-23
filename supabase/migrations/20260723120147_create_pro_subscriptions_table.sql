/*
# Create Pro subscriptions table for Stripe integration

1. New Table
- `pro_subscriptions` — tracks Stripe checkout sessions and Pro plan status per user.
  Columns: id, user_id (FK auth.users), stripe_customer_id, stripe_subscription_id,
  status (active/canceled/past_due/trialing), current_period_end, created_at, updated_at.

2. Security
- RLS enabled.
- Users can SELECT their own subscription status (used to check is_pro in the UI).
- INSERT/UPDATE/DELETE restricted to service role (used by the Stripe webhook edge function).
- The webhook function uses the service role key, which bypasses RLS.

3. Important Notes
- This table is populated by the Stripe webhook edge function (placeholder, not yet active).
- The `profiles.is_pro` column (created in the core migration) is the primary flag the UI checks.
- The webhook would set `profiles.is_pro = true` on checkout.session.completed and
  `profiles.is_pro = false` on customer.subscription.deleted.
*/

CREATE TABLE IF NOT EXISTS pro_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE pro_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_pro_subscriptions" ON pro_subscriptions;
CREATE POLICY "select_own_pro_subscriptions" ON pro_subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for authenticated users —
-- the Stripe webhook edge function uses the service role key which bypasses RLS.

CREATE UNIQUE INDEX IF NOT EXISTS idx_pro_subscriptions_user_id ON pro_subscriptions(user_id);
