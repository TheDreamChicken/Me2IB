import type { Contact } from "@/lib/types";

/** Days since the contact was last touched (falls back to when they were added). */
export function daysSinceTouch(contact: Contact): number {
  // last_contacted is a local calendar date; without it, measure from the
  // created_at instant (slicing to the UTC day is off by one for evening
  // creations in negative-offset timezones).
  const anchor = contact.last_contacted
    ? new Date(contact.last_contacted + "T00:00:00")
    : new Date(contact.created_at);
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Math.round (not floor) so a DST-shifted day (23h/25h) still counts as 1.
  return Math.round((todayMidnight.getTime() - anchor.getTime()) / 86_400_000);
}

/** Positive = overdue by N days; negative = due in N days. */
export function followupDelta(contact: Contact): number {
  return daysSinceTouch(contact) - (contact.followup_interval_days || 21);
}

export function isOverdue(contact: Contact): boolean {
  return contact.status !== "archived" && followupDelta(contact) >= 0;
}
