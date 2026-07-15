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

  if (appsRes.error) {
    throw new Error("Couldn't load applications: " + appsRes.error.message);
  }
  if (contactsRes.error) {
    throw new Error("Couldn't load contacts: " + contactsRes.error.message);
  }

  return (
    <ApplicationsView
      applications={(appsRes.data ?? []) as Application[]}
      contacts={(contactsRes.data ?? []) as Contact[]}
    />
  );
}
