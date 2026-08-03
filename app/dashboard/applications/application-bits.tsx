"use client";

import { CalendarClock } from "lucide-react";
import type { Application } from "@/lib/types";
import {
  APPLICATION_PROGRESS_STAGES,
  PRIORITIES,
  applicationProgressFor,
  companyLogoUrl,
  labelFor,
  statusColor,
} from "@/lib/constants";
import { Badge, cn } from "@/components/ui";
import { daysUntilLocal, useNow } from "@/components/use-today";
import { normalizeApplicationOutcome } from "./application-outcome";

/* ------------------------------------------------------------------ */
/* Status helpers                                                      */
/* ------------------------------------------------------------------ */

/** The forward-moving recruiting pipeline, separate from the final outcome. */
export const STATUS_PIPELINE = APPLICATION_PROGRESS_STAGES;

/** Keep legacy terminal rows usable without discarding their old decisions. */
export function normalizeProgressStatus(status: string): string {
  return applicationProgressFor(status);
}

export function statusIndex(status: string): number {
  return STATUS_PIPELINE.findIndex(
    (stage) => stage.value === normalizeProgressStatus(status)
  );
}

/** Submitted or further along (past in_progress). */
export function isSubmitted(app: Application): boolean {
  return statusIndex(app.status) >= 2;
}

/* ------------------------------------------------------------------ */
/* Date helpers                                                        */
/* ------------------------------------------------------------------ */

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date.length === 10 ? `${date}T00:00:00` : date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Days until a deadline, hydration-safe: pass `now` from useNow(). Returns
 * null (neutral) when `now` is null (SSR / pre-mount) or the date is invalid.
 */
export function daysUntil(
  date: string | null,
  now: Date | null
): number | null {
  if (!date || !now) return null;
  const key = date.slice(0, 10);
  if (Number.isNaN(new Date(`${key}T00:00:00`).getTime())) return null;
  return daysUntilLocal(key, now);
}

/** Red-alert deadline: within 7 days (or past) and not submitted yet. */
export function deadlineUrgent(app: Application, now: Date | null): boolean {
  const days = daysUntil(app.deadline, now);
  return (
    normalizeApplicationOutcome(app.outcome, app.status) === "waiting" &&
    days !== null &&
    days <= 7 &&
    !isSubmitted(app)
  );
}

/* ------------------------------------------------------------------ */
/* Badges & chips                                                      */
/* ------------------------------------------------------------------ */

export function StatusBadge({ status }: { status: string }) {
  const progress = normalizeProgressStatus(status);
  return (
    <Badge className={statusColor(progress)}>
      {labelFor(STATUS_PIPELINE, progress)}
    </Badge>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  dream: "bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-200",
  target: "bg-sky-50 text-sky-600 border border-sky-200",
  safety: "bg-teal-50 text-teal-600 border border-teal-200",
};

const MATERIAL_COLORS: Record<string, string> = {
  not_started: "bg-zinc-100 text-zinc-600",
  needed: "bg-rose-50 text-rose-600",
  drafting: "bg-amber-100 text-amber-700",
  tailored: "bg-violet-100 text-violet-700",
  done: "bg-emerald-100 text-emerald-700",
  submitted: "bg-blue-100 text-blue-700",
  not_required: "bg-zinc-100 text-zinc-500",
};

export function materialColor(value: string): string {
  return MATERIAL_COLORS[value] ?? "bg-zinc-100 text-zinc-600";
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge
      className={
        PRIORITY_STYLES[priority] ??
        "bg-zinc-50 text-zinc-500 border border-zinc-200"
      }
    >
      {labelFor(PRIORITIES, priority)}
    </Badge>
  );
}

export function DeadlineChip({ app }: { app: Application }) {
  const now = useNow();
  if (!app.deadline) return null;
  // Until mounted (now === null) days is null and urgent is false, so the
  // chip renders as a neutral formatted date — no SSR/client mismatch.
  const urgent = deadlineUrgent(app, now);
  const days = daysUntil(app.deadline, now);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs whitespace-nowrap",
        urgent ? "font-semibold text-rose-600" : "text-zinc-500"
      )}
      title={
        days !== null && days < 0
          ? `Deadline passed ${-days}d ago`
          : days !== null
            ? `${days}d until deadline`
            : undefined
      }
    >
      <CalendarClock className="h-3.5 w-3.5" />
      {formatDate(app.deadline)}
      {urgent && days !== null && (
        <span>({days < 0 ? `${-days}d ago` : days === 0 ? "today" : `${days}d`})</span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Company logo                                                        */
/* ------------------------------------------------------------------ */

export function CompanyLogo({
  company,
  size = "md",
}: {
  company: string;
  size?: "md" | "lg";
}) {
  const logo = companyLogoUrl(company);
  const cls =
    size === "lg" ? "h-14 w-14 rounded-2xl" : "h-10 w-10 rounded-xl";
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt=""
        className={cn(
          cls,
          "shrink-0 border border-brand-100 bg-white object-contain p-1.5"
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        cls,
        "flex shrink-0 items-center justify-center bg-brand-200 font-semibold text-brand-800",
        size === "lg" ? "text-xl" : "text-sm"
      )}
    >
      {company.slice(0, 1).toUpperCase()}
    </div>
  );
}
