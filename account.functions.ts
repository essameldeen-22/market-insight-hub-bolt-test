import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Permanently delete the signed-in user's account and all their data.
 * Cascade is done explicitly because the public tables don't have FK to auth.users.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;

    // 1. Wipe all user-owned rows via authenticated client (RLS enforces auth.uid()=user_id).
    const tables = ["competitor_analyses", "saas_stacks", "pricing_states", "roi_states"] as const;
    for (const table of tables) {
      const { error } = await context.supabase.from(table).delete().eq("user_id", uid);
      if (error) throw new Error(`Failed to delete from ${table}: ${error.message}`);
    }
    // Profile row uses `id` = auth uid.
    {
      const { error } = await context.supabase.from("profiles").delete().eq("id", uid);
      if (error) throw new Error(`Failed to delete profile: ${error.message}`);
    }

    // 2. Delete any contact_messages the user sent while signed in (matched by email).
    if (context.claims?.email) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("contact_messages").delete().eq("email", context.claims.email as string);
    }

    // 3. Delete the auth user itself (requires service role).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (authErr) throw new Error(`Failed to delete auth user: ${authErr.message}`);

    return { ok: true };
  });
