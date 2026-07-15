// Shared types + date helpers + rule-based suggestion engine for the calendar.

import type { Application, CalendarEvent, Contact } from "@/lib/types";
import { EVENT_TYPES } from "@/lib/constants";
import { daysSinceTouch, followupDelta, isOverdue } from "@/lib/contact-utils";

/* ------------------------------------------------------------------ */
/* Slim row types (only the columns the calendar page fetches)         */
/* ------------------------------------------------------------------ */

export type ContactLite = Pick<
  Contact,
  | "id"
  | "name"
  | "company"
  | "last_contacted"
  | "followup_interval_days"
  | "created_at"
  | "status"
>;

export type ApplicationLite = Pick<
  Application,
  "id" | "company" | "position" | "status" | "deadline" | "next_step" | "next_step_date"
>;

export type Suggestion = {
  key: string;
  title: string;
  /** Local yyyy-mm-dd day the event should land on. */
  date: string;
  event_type: string;
  reason: string;
  contact_id?: string;
  application_id?: string;
};

/** The lite shape has every field the contact-utils helpers read. */
const asContact = (c: ContactLite) => c as Contact;

/* ------------------------------------------------------------------ */
/* Date helpers (all in the viewer's local timezone)                   */
/* ------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, "0");

/** Local yyyy-mm-dd key for a Date. */
export function dateKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local day an event falls on. */
export function eventDayKey(e: CalendarEvent): string {
  // All-day events are stored at UTC midnight; read the date straight off the
  // ISO string so every timezone buckets them onto the same calendar day.
  if (e.all_day) return e.start_at.slice(0, 10);
  return dateKeyOf(new Date(e.start_at));
}

export function todayKey(): string {
  return dateKeyOf(new Date());
}

export function addDaysKey(key: string, days: number): string {
  const d = new Date(key + "T00:00:00");
  d.setDate(d.getDate() + days);
  return dateKeyOf(d);
}

/** "HH:MM" (24h) for prefilling <input type="time">. */
export function timeOf(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDayKey(
  key: string,
  opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }
): string {
  return new Date(key + "T00:00:00").toLocaleDateString("en-US", opts);
}

/** "9:00 AM – 10:30 AM", "9:00 AM", or null for all-day events. */
export function formatEventTime(e: CalendarEvent): string | null {
  if (e.all_day) return null;
  const fmt: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const start = new Date(e.start_at).toLocaleTimeString("en-US", fmt);
  if (!e.end_at) return start;
  return `${start} – ${new Date(e.end_at).toLocaleTimeString("en-US", fmt)}`;
}

export function typeColor(type: string): string {
  return (
    EVENT_TYPES.find((t) => t.value === type)?.color ??
    "bg-zinc-100 text-zinc-600 border-zinc-200"
  );
}

/* ------------------------------------------------------------------ */
/* Month grid                                                          */
/* ------------------------------------------------------------------ */

export type MonthCell = { key: string; day: number; inMonth: boolean };

/** Sunday-first cells covering every week that touches the given month. */
export function buildMonthCells(year: number, month: number): MonthCell[] {
  const lead = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;
  const cells: MonthCell[] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(year, month, i - lead + 1);
    cells.push({ key: dateKeyOf(d), day: d.getDate(), inMonth: d.getMonth() === month });
  }
  return cells;
}

/* ------------------------------------------------------------------ */
/* Smart suggestions (rule-based, no AI)                               */
/* ------------------------------------------------------------------ */

const MAX_SUGGESTIONS = 8;
const DEADLINE_WINDOW_DAYS = 10;

/** Once an application is past submission (or dead), its deadline is noise. */
const DEADLINE_IRRELEVANT_STATUSES = new Set([
  "submitted",
  "online_assessment",
  "phone_screen",
  "first_round",
  "superday",
  "offer",
  "rejected",
  "withdrawn",
  "waitlisted",
]);

export function buildSuggestions(
  events: CalendarEvent[],
  contacts: ContactLite[],
  applications: ApplicationLite[]
): Suggestion[] {
  const today = todayKey();
  const horizon = addDaysKey(today, DEADLINE_WINDOW_DAYS);
  const existing = new Set(events.map((e) => `${e.title}|${eventDayKey(e)}`));
  const out: Suggestion[] = [];

  // 1. Contacts overdue for a follow-up -> nudge to reach out today.
  [...contacts]
    .filter((c) => isOverdue(asContact(c)))
    .sort((a, b) => followupDelta(asContact(b)) - followupDelta(asContact(a)))
    .forEach((c) => {
      out.push({
        key: `followup-${c.id}`,
        title: `Follow up with ${c.name}`,
        date: today,
        event_type: "followup",
        contact_id: c.id,
        reason: c.last_contacted
          ? `${daysSinceTouch(asContact(c))}d since last touch`
          : "Never contacted",
      });
    });

  // 2. Application deadlines within 10 days that aren't on the calendar yet.
  applications
    .filter(
      (a) =>
        a.deadline !== null &&
        a.deadline >= today &&
        a.deadline <= horizon &&
        !DEADLINE_IRRELEVANT_STATUSES.has(a.status) &&
        !events.some(
          (e) =>
            e.event_type === "deadline" &&
            e.application_id === a.id &&
            eventDayKey(e) === a.deadline
        )
    )
    .sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))
    .forEach((a) => {
      out.push({
        key: `deadline-${a.id}`,
        title: `Deadline: ${a.company}`,
        date: a.deadline!,
        event_type: "deadline",
        application_id: a.id,
        reason: a.position ? `${a.position} application due` : "Application due",
      });
    });

  // 3. Upcoming next steps saved on applications.
  applications
    .filter((a) => a.next_step && a.next_step_date && a.next_step_date >= today)
    .sort((a, b) => (a.next_step_date! < b.next_step_date! ? -1 : 1))
    .forEach((a) => {
      out.push({
        key: `next-step-${a.id}`,
        title: `${a.next_step} — ${a.company}`,
        date: a.next_step_date!,
        event_type: "other",
        application_id: a.id,
        reason: "Next step on your application",
      });
    });

  // Skip anything already materialized (same title on the same day), cap at 8.
  return out
    .filter((s) => !existing.has(`${s.title}|${s.date}`))
    .slice(0, MAX_SUGGESTIONS);
}
