import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/types";
import { ContactsView } from "./contacts-view";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  return <ContactsView contacts={(data ?? []) as Contact[]} />;
}
