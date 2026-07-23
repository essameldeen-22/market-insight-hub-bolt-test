import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---- SaaS stack ----

const SaasToolSchema = z.object({
  id: z.string(),
  name: z.string().max(120).default(""),
  category: z.string().max(60).default(""),
  cost: z.number().min(0).max(1_000_000).default(0),
  users: z.number().min(0).max(1_000_000).default(0),
  usage: z.number().min(0).max(100).default(100),
});

export type SaasTool = z.infer<typeof SaasToolSchema>;

export const loadSaasStack = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saas_stacks")
      .select("tools")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return (data?.tools ?? []) as SaasTool[];
  });

export const saveSaasStack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ tools: z.array(SaasToolSchema).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("saas_stacks")
      .upsert({ user_id: context.userId, tools: data.tools }, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true };
  });

// ---- Pricing state ----

const PricingStateSchema = z.object({
  cost: z.number().default(0),
  customers: z.number().default(0),
  competitor: z.number().default(0),
  margin: z.number().default(30),
  model: z.enum(["subscription", "onetime", "freemium"]).default("subscription"),
});

export type PricingState = z.infer<typeof PricingStateSchema>;

export const loadPricingState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pricing_states")
      .select("state")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return (data?.state ?? {}) as Partial<PricingState>;
  });

export const savePricingState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ state: PricingStateSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pricing_states")
      .upsert({ user_id: context.userId, state: data.state }, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true };
  });

// ---- ROI state ----

const RoiStateSchema = z.object({
  initial: z.number().default(0),
  monthly: z.number().default(0),
  savings: z.number().default(0),
  revenue: z.number().default(0),
  period: z.number().min(1).max(120).default(12),
});

export type RoiState = z.infer<typeof RoiStateSchema>;

export const loadRoiState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("roi_states")
      .select("state")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return (data?.state ?? {}) as Partial<RoiState>;
  });

export const saveRoiState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ state: RoiStateSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("roi_states")
      .upsert({ user_id: context.userId, state: data.state }, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true };
  });

// ---- Profile (language + currency + theme) ----

const ProfileSchema = z.object({
  preferred_language: z.enum(["ar", "en"]).default("ar"),
  preferred_currency: z.enum(["USD", "EGP", "SAR", "AED"]).default("USD"),
  theme: z.enum(["dark", "light", "auto"]).default("dark"),
  display_name: z.string().max(120).nullable().optional(),
});

export type ProfileState = z.infer<typeof ProfileSchema>;

export const loadProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("display_name, preferred_language, preferred_currency, theme")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return data ?? { display_name: null, preferred_language: "ar", preferred_currency: "USD", theme: "dark" };
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProfileSchema.partial().parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update(data)
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
