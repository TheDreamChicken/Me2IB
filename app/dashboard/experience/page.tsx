import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Experience } from "@/lib/types";
import { ExperienceView } from "./experience-view";

export const metadata: Metadata = { title: "Experience" };

export default async function ExperiencePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("experiences")
    .select("*")
    .order("created_at", { ascending: false });

  return <ExperienceView experiences={(data ?? []) as Experience[]} />;
}
