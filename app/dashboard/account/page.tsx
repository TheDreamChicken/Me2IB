import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { AccountView } from "./account-view";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error("Couldn't load your profile: " + error.message);
  }

  // Admin-only AI engine card: current model (app_settings may not exist
  // before schema.sql is re-run — treat errors as "no override set").
  const { data: modelRow } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "ai_model")
    .maybeSingle();

  return (
    <AccountView
      profile={(data as Profile | null) ?? null}
      userId={user?.id ?? ""}
      email={user?.email ?? null}
      memberSince={user?.created_at ?? null}
      aiModel={modelRow?.value ?? null}
      hasAnthropicKey={!!process.env.ANTHROPIC_API_KEY}
      hasOpenAIKey={!!process.env.OPENAI_API_KEY}
    />
  );
}
