import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---- Submit a new SaaS alternative suggestion ----

const SuggestionInputSchema = z.object({
  tool_name: z.string().min(1).max(120),
  category: z.string().max(60).default("Other"),
  alternative_name: z.string().min(1).max(120),
  estimated_savings_pct: z.number().int().min(0).max(100).default(50),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  notes: z.string().max(500).optional(),
});

export type SuggestionInput = z.infer<typeof SuggestionInputSchema>;

export const submitSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SuggestionInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pending_suggestions")
      .insert({
        submitter_id: context.userId,
        tool_name: data.tool_name,
        category: data.category,
        alternative_name: data.alternative_name,
        estimated_savings_pct: data.estimated_savings_pct,
        difficulty: data.difficulty,
        notes: data.notes,
        status: "pending",
      });
    if (error) throw error;
    return { ok: true };
  });

// ---- Load the current user's own submissions ----

export const loadMySuggestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pending_suggestions")
      .select("id, tool_name, category, alternative_name, estimated_savings_pct, difficulty, notes, status, created_at, reviewed_at")
      .eq("submitter_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

// ---- Load all approved alternatives from the database (supplements static list) ----

export const loadApprovedAlternatives = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saas_alternatives")
      .select("from_tool, to_tool, save, difficulty, category")
      .order("from_tool", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

// ---- Admin: load all pending suggestions ----

export const loadAllPendingSuggestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pending_suggestions")
      .select("id, submitter_id, tool_name, category, alternative_name, estimated_savings_pct, difficulty, notes, status, created_at, reviewed_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

// ---- Admin: approve a suggestion (moves it into saas_alternatives) ----

const ApproveInputSchema = z.object({
  suggestion_id: z.string().uuid(),
});

export const approveSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ApproveInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Fetch the suggestion
    const { data: suggestion, error: fetchErr } = await context.supabase
      .from("pending_suggestions")
      .select("*")
      .eq("id", data.suggestion_id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!suggestion) throw new Error("Suggestion not found");

    // Insert into approved alternatives
    const { error: insertErr } = await context.supabase
      .from("saas_alternatives")
      .insert({
        from_tool: suggestion.tool_name,
        to_tool: suggestion.alternative_name,
        save: suggestion.estimated_savings_pct / 100,
        difficulty: suggestion.difficulty,
        category: suggestion.category,
        approved_by: context.userId,
      });
    if (insertErr) throw insertErr;

    // Mark suggestion as approved
    const { error: updateErr } = await context.supabase
      .from("pending_suggestions")
      .update({ status: "approved", reviewer_id: context.userId, reviewed_at: new Date().toISOString() })
      .eq("id", data.suggestion_id);
    if (updateErr) throw updateErr;

    return { ok: true };
  });

// ---- Admin: reject a suggestion ----

const RejectInputSchema = z.object({
  suggestion_id: z.string().uuid(),
});

export const rejectSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RejectInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pending_suggestions")
      .update({ status: "rejected", reviewer_id: context.userId, reviewed_at: new Date().toISOString() })
      .eq("id", data.suggestion_id);
    if (error) throw error;
    return { ok: true };
  });
