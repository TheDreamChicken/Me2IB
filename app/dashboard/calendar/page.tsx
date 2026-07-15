import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent } from "@/lib/types";
import { CalendarView } from "./calendar-view";
import type { ApplicationLite, ContactLite } from "./calendar-utils";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const supabase = await createClient();

  const [eventsRes, contactsRes, applicationsRes] = await Promise.all([
    supabase.from("events").select("*").order("start_at", { ascending: true }),
    supabase
      .from("contacts")
      .select(
        "id, name, company, last_contacted, followup_interval_days, created_at, status"
      )
      .order("name", { ascending: true }),
    supabase
      .from("applications")
      .select("id, company, position, status, deadline, next_step, next_step_date")
      .order("company", { ascending: true }),
  ]);

  const failure =
    eventsRes.error ?? contactsRes.error ?? applicationsRes.error;
  if (failure) throw new Error("Couldn't load calendar: " + failure.message);

  return (
    <CalendarView
      events={(eventsRes.data ?? []) as CalendarEvent[]}
      contacts={(contactsRes.data ?? []) as ContactLite[]}
      applications={(applicationsRes.data ?? []) as ApplicationLite[]}
    />
  );
}
