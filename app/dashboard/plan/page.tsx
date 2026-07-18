import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Plan, Profile } from "@/lib/types";
import { PlanView } from "./plan-view";

export const metadata: Metadata = { title: "My Plan" };

export default async function PlanPage() {
  const supabase = await createClient();

  const [profileRes, contactsRes, applicationsRes, planRes] = await Promise.all([
    supabase.from("profiles").select("*").maybeSingle(),
    supabase.from("contacts").select("*", { count: "exact", head: true }),
    supabase.from("applications").select("*", { count: "exact", head: true }),
    supabase
      .from("plans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileRes.error) {
    throw new Error("Couldn't load your profile: " + profileRes.error.message);
  }
  if (contactsRes.error) {
    throw new Error("Couldn't load contacts: " + contactsRes.error.message);
  }
  if (applicationsRes.error) {
    throw new Error(
      "Couldn't load applications: " + applicationsRes.error.message
    );
  }
  if (planRes.error) {
    throw new Error("Couldn't load your saved plan: " + planRes.error.message);
  }

  return (
    <PlanView
      profile={(profileRes.data ?? null) as Profile | null}
      contactsCount={contactsRes.count ?? 0}
      applicationsCount={applicationsRes.count ?? 0}
      plan={(planRes.data ?? null) as Plan | null}
    />
  );
}
