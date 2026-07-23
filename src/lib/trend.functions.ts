import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AnalysisSummary {
  id: string;
  product_name: string;
  created_at: string;
  sentiment: { positive: number; negative: number; mixed: number; neutral: number };
  totalReviews: number;
}

export const loadAnalysisHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("competitor_analyses")
      .select("id, product_name, created_at, result")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) throw error;

    const summaries: AnalysisSummary[] = [];
    for (const row of data ?? []) {
      const r = row.result as { sentiment?: AnalysisSummary["sentiment"]; totalReviews?: number } | null;
      if (!r?.sentiment) continue;
      summaries.push({
        id: row.id,
        product_name: row.product_name || "",
        created_at: row.created_at,
        sentiment: r.sentiment,
        totalReviews: r.totalReviews ?? 0,
      });
    }
    return summaries;
  });
