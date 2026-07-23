/*
# Create crowd-sourced SaaS alternatives tables

1. New Tables
- `pending_suggestions` — user-submitted tool/alternative pairs awaiting admin review.
  Columns: id, submitter_id (FK auth.users), tool_name, category, alternative_name,
  estimated_savings_pct (0-100), difficulty (easy/medium/hard), notes, status (pending/approved/rejected),
  reviewer_id (FK auth.users), created_at, reviewed_at.
- `saas_alternatives` — approved alternatives that augment the static list in saas-alts.ts.
  Columns: id, from_tool, to_tool, save (0-1 fraction), difficulty, category, approved_by, created_at.

2. Security
- RLS enabled on both tables.
- `pending_suggestions`: any authenticated user can submit (INSERT) and read their own submissions (SELECT).
  Only admin users can read ALL submissions, update status, or delete.
- `saas_alternatives`: any authenticated user can SELECT (so the savings calculator can use them).
  Only admin can INSERT/UPDATE/DELETE.
- Admin is determined by comparing auth.uid() to a hardcoded admin user ID stored in a Postgres function `is_admin()`.
  The admin user ID defaults to a placeholder UUID that the new owner must replace.

3. Important Notes
- The `is_admin()` function checks `auth.uid()` against the `APP_ADMIN_USER_ID` setting.
  To set your admin user, run: `ALTER DATABASE current_database() SET app.admin_user_id = 'your-uuid-here';`
  Or set it at the project level in Supabase dashboard > Database > Settings > Config parameters.
*/

CREATE TABLE IF NOT EXISTS pending_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  alternative_name text NOT NULL,
  estimated_savings_pct integer NOT NULL DEFAULT 50 CHECK (estimated_savings_pct >= 0 AND estimated_savings_pct <= 100),
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);
ALTER TABLE pending_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_pending_suggestions" ON pending_suggestions;
CREATE POLICY "select_own_pending_suggestions" ON pending_suggestions FOR SELECT
  TO authenticated USING (auth.uid() = submitter_id);

DROP POLICY IF EXISTS "insert_own_pending_suggestions" ON pending_suggestions;
CREATE POLICY "insert_own_pending_suggestions" ON pending_suggestions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = submitter_id);

-- Admin-only policies: we use a SECURITY DEFINER function for admin checks
-- so that RLS can call it without circular dependency.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid()::text = COALESCE(
    current_setting('app.admin_user_id', true),
    '00000000-0000-0000-0000-000000000000'
  );
$$;

-- Admin can see all submissions
DROP POLICY IF EXISTS "admin_select_all_pending_suggestions" ON pending_suggestions;
CREATE POLICY "admin_select_all_pending_suggestions" ON pending_suggestions FOR SELECT
  TO authenticated USING (public.is_admin());

-- Admin can update (approve/reject) submissions
DROP POLICY IF EXISTS "admin_update_pending_suggestions" ON pending_suggestions;
CREATE POLICY "admin_update_pending_suggestions" ON pending_suggestions FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Admin can delete submissions
DROP POLICY IF EXISTS "admin_delete_pending_suggestions" ON pending_suggestions;
CREATE POLICY "admin_delete_pending_suggestions" ON pending_suggestions FOR DELETE
  TO authenticated USING (public.is_admin());

CREATE TABLE IF NOT EXISTS saas_alternatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_tool text NOT NULL,
  to_tool text NOT NULL,
  save numeric NOT NULL DEFAULT 0.5 CHECK (save >= 0 AND save <= 1),
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category text NOT NULL DEFAULT 'Other',
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE saas_alternatives ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read approved alternatives (used by savings calculator)
DROP POLICY IF EXISTS "select_all_saas_alternatives" ON saas_alternatives;
CREATE POLICY "select_all_saas_alternatives" ON saas_alternatives FOR SELECT
  TO authenticated USING (true);

-- Only admin can insert/update/delete
DROP POLICY IF EXISTS "admin_insert_saas_alternatives" ON saas_alternatives;
CREATE POLICY "admin_insert_saas_alternatives" ON saas_alternatives FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_saas_alternatives" ON saas_alternatives;
CREATE POLICY "admin_update_saas_alternatives" ON saas_alternatives FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_saas_alternatives" ON saas_alternatives;
CREATE POLICY "admin_delete_saas_alternatives" ON saas_alternatives FOR DELETE
  TO authenticated USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_pending_suggestions_status ON pending_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_saas_alternatives_from_tool ON saas_alternatives(lower(from_tool));
