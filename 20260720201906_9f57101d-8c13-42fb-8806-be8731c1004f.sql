
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'ar',
  preferred_currency TEXT NOT NULL DEFAULT 'USD',
  theme TEXT NOT NULL DEFAULT 'dark',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Competitor analyses
CREATE TABLE public.competitor_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL DEFAULT '',
  reviews_text TEXT NOT NULL DEFAULT '',
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitor_analyses TO authenticated;
GRANT ALL ON public.competitor_analyses TO service_role;
ALTER TABLE public.competitor_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own competitor analyses" ON public.competitor_analyses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER competitor_analyses_updated BEFORE UPDATE ON public.competitor_analyses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX competitor_analyses_user_idx ON public.competitor_analyses(user_id, updated_at DESC);

-- SaaS stack: one row per user containing full list as JSONB
CREATE TABLE public.saas_stacks (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saas_stacks TO authenticated;
GRANT ALL ON public.saas_stacks TO service_role;
ALTER TABLE public.saas_stacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saas stack" ON public.saas_stacks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER saas_stacks_updated BEFORE UPDATE ON public.saas_stacks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pricing calculator state (single row per user)
CREATE TABLE public.pricing_states (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_states TO authenticated;
GRANT ALL ON public.pricing_states TO service_role;
ALTER TABLE public.pricing_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pricing state" ON public.pricing_states FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pricing_states_updated BEFORE UPDATE ON public.pricing_states FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ROI calculator state
CREATE TABLE public.roi_states (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roi_states TO authenticated;
GRANT ALL ON public.roi_states TO service_role;
ALTER TABLE public.roi_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roi state" ON public.roi_states FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER roi_states_updated BEFORE UPDATE ON public.roi_states FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contact messages (Phase 2 form, table ready now; anon can insert)
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can send" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
