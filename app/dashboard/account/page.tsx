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

  return (
    <AccountView
      profile={(data as Profile | null) ?? null}
      email={user?.email ?? null}
      memberSince={user?.created_at ?? null}
    />
  );
}
