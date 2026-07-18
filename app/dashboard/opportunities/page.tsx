import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Opportunity } from "@/lib/types";
import { OpportunitiesView } from "./opportunities-view";

export const metadata: Metadata = { title: "Opportunities" };

export default async function OpportunitiesPage() {
  const supabase = await createClient();
  const [{ data, error }, { data: profile }] = await Promise.all([
    supabase
      .from("opportunities")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("target_industries").maybeSingle(),
  ]);

  if (error) {
    throw new Error("Couldn't load opportunities: " + error.message);
  }

  return (
    <OpportunitiesView
      opportunities={(data ?? []) as Opportunity[]}
      targetIndustries={profile?.target_industries ?? []}
    />
  );
}
