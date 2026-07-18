import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Contact, Profile } from "@/lib/types";
import { ContactsView } from "./contacts-view";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage() {
  const supabase = await createClient();

  const [contactsRes, profileRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").maybeSingle(),
  ]);

  if (contactsRes.error) {
    throw new Error("Couldn't load contacts: " + contactsRes.error.message);
  }
  if (profileRes.error) {
    throw new Error("Couldn't load your profile: " + profileRes.error.message);
  }

  return (
    <ContactsView
      contacts={(contactsRes.data ?? []) as Contact[]}
      profile={(profileRes.data ?? null) as Profile | null}
    />
  );
}
