import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Story } from "@/lib/types";
import { StoriesView } from "./stories-view";

export const metadata: Metadata = { title: "Story bank" };

export default async function StoriesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stories")
    .select("*")
    .order("created_at", { ascending: false });

  return <StoriesView stories={(data ?? []) as Story[]} />;
}
