/*
# Create core application tables

1. New Tables
- `profiles` — user profile (display name, preferred language/currency/theme)
- `saas_stacks` — per-user SaaS tool inventory (JSON array of tools)
- `pricing_states` — per-user pricing calculator state
- `roi_states` — per-user ROI calculator state
- `competitor_analyses` — saved competitor analysis results (product name, sentiment, topics, pains, strengths)

2. Security
- RLS enabled on all tables.
- Owner-scoped CRUD: each authenticated user can only access their own rows.
- `user_id` columns default to `auth.uid()` so inserts that omit the owner still satisfy RLS.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  preferred_language text DEFAULT 'ar',
  preferred_currency text DEFAULT 'USD',
  theme text DEFAULT 'dark',
  is_pro boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS saas_stacks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE saas_stacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_saas_stacks" ON saas_stacks;
CREATE POLICY "select_own_saas_stacks" ON saas_stacks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_saas_stacks" ON saas_stacks;
CREATE POLICY "insert_own_saas_stacks" ON saas_stacks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_saas_stacks" ON saas_stacks;
CREATE POLICY "update_own_saas_stacks" ON saas_stacks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_saas_stacks" ON saas_stacks;
CREATE POLICY "delete_own_saas_stacks" ON saas_stacks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS pricing_states (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE pricing_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_pricing_states" ON pricing_states;
CREATE POLICY "select_own_pricing_states" ON pricing_states FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_pricing_states" ON pricing_states;
CREATE POLICY "insert_own_pricing_states" ON pricing_states FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_pricing_states" ON pricing_states;
CREATE POLICY "update_own_pricing_states" ON pricing_states FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_pricing_states" ON pricing_states;
CREATE POLICY "delete_own_pricing_states" ON pricing_states FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS roi_states (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE roi_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_roi_states" ON roi_states;
CREATE POLICY "select_own_roi_states" ON roi_states FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_roi_states" ON roi_states;
CREATE POLICY "insert_own_roi_states" ON roi_states FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_roi_states" ON roi_states;
CREATE POLICY "update_own_roi_states" ON roi_states FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_roi_states" ON roi_states;
CREATE POLICY "delete_own_roi_states" ON roi_states FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS competitor_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name text NOT NULL DEFAULT '',
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE competitor_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_competitor_analyses" ON competitor_analyses;
CREATE POLICY "select_own_competitor_analyses" ON competitor_analyses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_competitor_analyses" ON competitor_analyses;
CREATE POLICY "insert_own_competitor_analyses" ON competitor_analyses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_competitor_analyses" ON competitor_analyses;
CREATE POLICY "update_own_competitor_analyses" ON competitor_analyses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_competitor_analyses" ON competitor_analyses;
CREATE POLICY "delete_own_competitor_analyses" ON competitor_analyses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_competitor_analyses_user_id ON competitor_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_competitor_analyses_created_at ON competitor_analyses(created_at);
