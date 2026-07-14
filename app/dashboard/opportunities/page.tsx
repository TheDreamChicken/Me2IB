import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Opportunity } from "@/lib/types";
import { OpportunitiesView } from "./opportunities-view";

export const metadata: Metadata = { title: "Opportunities" };

export default async function OpportunitiesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("opportunities")
    .select("*")
    .order("created_at", { ascending: false });

  return <OpportunitiesView opportunities={(data ?? []) as Opportunity[]} />;
}
