import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AnalyzeInput = z.object({
  productName: z.string().max(200).default(""),
  reviews: z.array(z.string().min(1).max(2000)).min(1).max(200),
});

export const analyzeReviewsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { analyzeReviews } = await import("./claude.server");
    const result = await analyzeReviews(data.productName, data.reviews);

    // Persist the latest analysis for this user + product.
    try {
      await context.supabase.from("competitor_analyses").insert({
        user_id: context.userId,
        product_name: data.productName,
        reviews_text: data.reviews.join("\n"),
        result: result as unknown as never,
      });
    } catch (e) {
      // Persistence failures shouldn't block returning the result to the user.
      console.error("Failed to persist analysis:", e);
    }

    return result;
  });
