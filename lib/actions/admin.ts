"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { providerForModel } from "@/lib/ai-models";

export type ActionResult = { error?: string; ok?: boolean };

/**
 * Set the app-wide AI model (admin only — the profiles.is_admin flag can
 * only be granted from the Supabase SQL editor, and the app_settings RLS
 * policy re-enforces the same check at the database layer).
 */
export async function setAiModel(model: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return { error: "Only the site admin can change the AI engine." };
  }

  const cleaned = model.trim();
  if (!cleaned) return { error: "Pick or type a model first." };
  if (cleaned.length > 100 || !/^[a-z0-9.\-_]+$/i.test(cleaned)) {
    return { error: "That doesn't look like a model ID (letters, digits, dots, dashes)." };
  }
  if (!providerForModel(cleaned)) {
    return {
      error:
        "Unrecognized model family — use a claude-* (Anthropic) or gpt-* (OpenAI) model ID.",
    };
  }

  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "ai_model", value: cleaned }, { onConflict: "key" });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/account");
  return { ok: true };
}
