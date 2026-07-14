import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Application, Contact } from "@/lib/types";
import { ApplicationsView } from "./applications-view";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const [appsRes, contactsRes] = await Promise.all([
    supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("contacts").select("*").order("name", { ascending: true }),
  ]);

  return (
    <ApplicationsView
      applications={(appsRes.data ?? []) as Application[]}
      contacts={(contactsRes.data ?? []) as Contact[]}
    />
  );
}
