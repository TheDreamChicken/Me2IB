import type { Contact } from "@/lib/types";

/** Days since the contact was last touched (falls back to when they were added). */
export function daysSinceTouch(contact: Contact): number {
  const base = contact.last_contacted ?? contact.created_at.slice(0, 10);
  const then = new Date(base + "T00:00:00");
  return Math.floor((Date.now() - then.getTime()) / 86_400_000);
}

/** Positive = overdue by N days; negative = due in N days. */
export function followupDelta(contact: Contact): number {
  return daysSinceTouch(contact) - (contact.followup_interval_days || 21);
}

export function isOverdue(contact: Contact): boolean {
  return contact.status !== "archived" && followupDelta(contact) >= 0;
}
