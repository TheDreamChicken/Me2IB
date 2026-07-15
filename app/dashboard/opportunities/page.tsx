import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Opportunity } from "@/lib/types";
import { OpportunitiesView } from "./opportunities-view";

export const metadata: Metadata = { title: "Opportunities" };

export default async function OpportunitiesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Couldn't load opportunities: " + error.message);
  }

  return <OpportunitiesView opportunities={(data ?? []) as Opportunity[]} />;
}
