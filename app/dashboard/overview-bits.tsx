"use client";

import { Badge, PageHeader } from "@/components/ui";
import { daysUntilLocal, useNow } from "@/components/use-today";

// One per weekday — deterministic, so the greeting stays stable all day.
const SUBTITLES = [
  "A quiet Sunday email beats a noisy Monday one. One small step today.",
  "New week, new coffee chats. Let's make something happen.",
  "Consistency beats intensity — one touchpoint today is plenty.",
  "Halfway there. Keep the momentum going.",
  "Every follow-up you send compounds. Keep going.",
  "Finish the week strong — future you will say thanks.",
  "Weekends are for prep. A little polish goes a long way.",
];

function dueLabel(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

function dueBadgeColor(days: number): string {
  if (days <= 2) return "bg-rose-50 text-rose-600";
  if (days <= 7) return "bg-amber-50 text-amber-600";
  return "bg-brand-50 text-brand-600";
}

/**
 * Greeting header. The date and weekday subtitle are computed from the
 * viewer's clock after mount so they're never wrong across timezones.
 */
export function TodayHeading({ firstName }: { firstName: string }) {
  const now = useNow();
  const description = now
    ? `${now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })} — ${SUBTITLES[now.getDay()]}`
    : "…";
  return (
    <PageHeader
      title={`Welcome back, ${firstName}`}
      description={description}
    />
  );
}

/**
 * "Today / Tomorrow / In N days" badge for a YYYY-MM-DD date, computed in
 * the viewer's timezone. Neutral placeholder until mounted.
 */
export function DueBadge({ dateStr }: { dateStr: string }) {
  const now = useNow();
  if (!now) return <Badge className="bg-brand-50 text-brand-600">&hellip;</Badge>;
  const days = daysUntilLocal(dateStr, now);
  return <Badge className={dueBadgeColor(days)}>{dueLabel(days)}</Badge>;
}
