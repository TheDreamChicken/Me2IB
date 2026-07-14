import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { PlanView } from "./plan-view";

export const metadata: Metadata = { title: "My Plan" };

export default async function PlanPage() {
  const supabase = await createClient();

  const [profileRes, contactsRes, applicationsRes] = await Promise.all([
    supabase.from("profiles").select("*").maybeSingle(),
    supabase.from("contacts").select("*", { count: "exact", head: true }),
    supabase.from("applications").select("*", { count: "exact", head: true }),
  ]);

  return (
    <PlanView
      profile={(profileRes.data ?? null) as Profile | null}
      contactsCount={contactsRes.count ?? 0}
      applicationsCount={applicationsRes.count ?? 0}
    />
  );
}
