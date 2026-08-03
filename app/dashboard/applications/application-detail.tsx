"use client";

import { useState, useTransition } from "react";
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Handshake,
  HelpCircle,
  MapPin,
  Mic,
  StickyNote,
  Users,
} from "lucide-react";
import type { Application, Contact } from "@/lib/types";
import {
  INDUSTRIES,
  MATERIAL_STATUSES,
  APPLICATION_PROGRESS_STAGES,
  TIERS,
  labelFor,
} from "@/lib/constants";
import {
  deleteApplication,
  setApplicationOutcome,
  setApplicationStatus,
} from "@/lib/actions/applications";
import {
  Badge,
  Button,
  Select,
  Spinner,
  cn,
  useModalScrollTop,
} from "@/components/ui";
import { PreferenceDeleteButton as DeleteButton } from "@/app/dashboard/settings/delete-button";
import { useNow } from "@/components/use-today";
import {
  CompanyLogo,
  PriorityBadge,
  STATUS_PIPELINE,
  StatusBadge,
  deadlineUrgent,
  formatDate,
  materialColor,
  normalizeProgressStatus,
} from "./application-bits";
import {
  normalizeApplicationOutcome,
  OutcomeBadge,
  OutcomePicker,
  type ApplicationOutcome,
} from "./application-outcome";

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-400">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      {children}
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
      <div className="min-w-0">
        <p className="text-xs text-zinc-400">{label}</p>
        <p className={cn("break-words text-sm text-brand-900", valueClassName)}>
          {value}
        </p>
      </div>
    </div>
  );
}

function NoteBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-zinc-400">{label}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status pipeline                                                     */
/* ------------------------------------------------------------------ */

function StatusPipeline({ app }: { app: Application }) {
  const progress = normalizeProgressStatus(app.status);
  const currentIdx = STATUS_PIPELINE.findIndex((s) => s.value === progress);

  return (
    <div className="pt-1">
      <div className="flex items-start overflow-x-auto px-1 pb-1 pt-1.5">
        {STATUS_PIPELINE.map((s, i) => {
          const done = currentIdx >= 0 && i < currentIdx;
          const current = i === currentIdx;
          return (
            <div
              key={s.value}
              className="flex min-w-14 flex-1 flex-col items-center"
            >
              <div className="flex w-full items-center">
                <div
                  className={cn(
                    "h-0.5 flex-1",
                    i === 0
                      ? "bg-transparent"
                      : done || current
                        ? "bg-brand-400"
                        : "bg-brand-100"
                  )}
                />
                <div
                  className={cn(
                    "h-3 w-3 shrink-0 rounded-full border-2",
                    current
                      ? "scale-125 border-brand-600 bg-brand-600 ring-2 ring-brand-200"
                      : done
                        ? "border-brand-400 bg-brand-400"
                        : "border-brand-200 bg-white"
                  )}
                />
                <div
                  className={cn(
                    "h-0.5 flex-1",
                    i === STATUS_PIPELINE.length - 1
                      ? "bg-transparent"
                      : done
                        ? "bg-brand-400"
                        : "bg-brand-100"
                  )}
                />
              </div>
              <span
                className={cn(
                  "mt-1.5 px-0.5 text-center text-[10px] leading-tight",
                  current
                    ? "font-semibold text-brand-800"
                    : done
                      ? "text-brand-500"
                      : "text-zinc-400"
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

export function ApplicationDetail({
  app,
  contacts,
  onEdit,
  onClose,
}: {
  app: Application;
  contacts: Contact[];
  onEdit: () => void;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const now = useNow();
  const scrollModalToTop = useModalScrollTop();

  const referral = app.referral_contact_id
    ? (contacts.find((c) => c.id === app.referral_contact_id) ?? null)
    : null;

  const progress = normalizeProgressStatus(app.status);
  const outcome = normalizeApplicationOutcome(app.outcome, app.status);
  const currentIdx = STATUS_PIPELINE.findIndex((s) => s.value === progress);
  const nextStatus =
    currentIdx >= 0 && currentIdx < STATUS_PIPELINE.length - 1
      ? STATUS_PIPELINE[currentIdx + 1]
      : null;

  function changeStatus(status: string) {
    setError(null);
    startTransition(async () => {
      const res = await setApplicationStatus(app.id, status);
      if (res.error) setError(res.error);
    });
  }

  function changeOutcome(nextOutcome: ApplicationOutcome) {
    setError(null);
    startTransition(async () => {
      const res = await setApplicationOutcome(app.id, nextOutcome);
      if (res.error) setError(res.error);
    });
  }

  const tierLabel = app.tier
    ? labelFor(TIERS[app.industry] ?? [], app.tier)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 rounded-2xl bg-gradient-to-br from-brand-100 via-brand-50 to-white p-5">
        <CompanyLogo company={app.company} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-brand-900">
            {app.company}
          </h3>
          <p className="text-sm text-zinc-500">
            {app.position || "No position saved yet"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={app.status} />
            <OutcomeBadge outcome={outcome} />
            <PriorityBadge priority={app.priority} />
            <Badge>{labelFor(INDUSTRIES, app.industry)}</Badge>
            {app.sector && (
              <Badge className="bg-brand-50 text-brand-600">{app.sector}</Badge>
            )}
            {tierLabel && (
              <Badge className="bg-white text-brand-700 border border-brand-200">
                {tierLabel}
              </Badge>
            )}
            {app.networked && (
              <Badge className="bg-emerald-50 text-emerald-600">
                <Handshake className="h-3 w-3" /> Networked
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Overview */}
      <Section icon={Building2} title="Overview">
        {(app.application_link || app.posting_link) && (
          <div className="mb-3 flex flex-wrap gap-2">
            {app.application_link && (
              <a
                href={app.application_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-50"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Application portal
              </a>
            )}
            {app.posting_link && (
              <a
                href={app.posting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-50"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Job posting
              </a>
            )}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {app.location && (
            <InfoItem icon={MapPin} label="Location" value={app.location} />
          )}
          {app.work_type && (
            <InfoItem
              icon={Building2}
              label="Work type"
              value={
                app.work_type.charAt(0).toUpperCase() + app.work_type.slice(1)
              }
            />
          )}
          <InfoItem
            icon={CalendarDays}
            label="Type / season"
            value={[
              app.employment_type.charAt(0).toUpperCase() +
                app.employment_type.slice(1),
              app.season,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
          {app.hours_per_week && (
            <InfoItem
              icon={Clock}
              label="Hours / week"
              value={app.hours_per_week}
            />
          )}
          {app.pay && <InfoItem icon={Banknote} label="Pay" value={app.pay} />}
          {app.deadline && (
            <InfoItem
              icon={CalendarClock}
              label="Deadline"
              value={formatDate(app.deadline)}
              valueClassName={
                deadlineUrgent(app, now)
                  ? "font-semibold text-rose-600"
                  : undefined
              }
            />
          )}
          {app.date_applied && (
            <InfoItem
              icon={CalendarDays}
              label="Date applied"
              value={formatDate(app.date_applied)}
            />
          )}
          {referral && (
            <InfoItem
              icon={Users}
              label="Referral contact"
              value={referral.name}
            />
          )}
        </div>
      </Section>

      {/* Progress */}
      <Section icon={ArrowRight} title="Progress">
        <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
          <StatusPipeline app={app} />
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-brand-100 pt-3">
            {nextStatus && (
              <Button
                size="sm"
                disabled={pending}
                onClick={() => changeStatus(nextStatus.value)}
              >
                {pending ? (
                  <Spinner />
                ) : (
                  <>
                    Advance to {nextStatus.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            )}
            <Select
              value={progress}
              disabled={pending}
              onChange={(e) => changeStatus(e.target.value)}
              className="w-auto [&_select]:text-xs"
            >
              {APPLICATION_PROGRESS_STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Section>

      {/* Outcome */}
      <Section icon={CheckCircle2} title="Outcome">
        <div className="rounded-2xl border border-brand-100 bg-white p-3">
          <OutcomePicker
            value={outcome}
            onChange={changeOutcome}
            disabled={pending}
          />
          <p className="mt-2 px-1 text-xs text-zinc-400">
            The decision stays separate from the last recruiting stage you
            reached.
          </p>
        </div>
      </Section>

      {/* Materials */}
      <Section icon={FileText} title="Materials">
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoItem
            icon={FileText}
            label="Resume"
            value={
              <Badge className={materialColor(app.resume_status)}>
                {labelFor(MATERIAL_STATUSES, app.resume_status)}
              </Badge>
            }
          />
          <InfoItem
            icon={FileText}
            label="Cover letter"
            value={
              <Badge className={materialColor(app.cover_letter_status)}>
                {labelFor(MATERIAL_STATUSES, app.cover_letter_status)}
              </Badge>
            }
          />
          {app.materials_needed && (
            <InfoItem
              icon={FileText}
              label="Materials needed"
              value={app.materials_needed}
            />
          )}
          {app.missing_items && (
            <InfoItem
              icon={HelpCircle}
              label="Missing items"
              value={app.missing_items}
              valueClassName="text-rose-600"
            />
          )}
        </div>
      </Section>

      {/* Interview */}
      {(app.interview_notes || app.open_questions) && (
        <Section icon={Mic} title="Interview">
          <div className="space-y-3">
            {app.interview_notes && (
              <NoteBlock label="Interview notes" value={app.interview_notes} />
            )}
            {app.open_questions && (
              <NoteBlock label="Open questions" value={app.open_questions} />
            )}
          </div>
        </Section>
      )}

      {/* Next step */}
      {(app.next_step || app.next_step_date) && (
        <Section icon={ArrowRight} title="Next step">
          <div className="flex items-start gap-2.5 rounded-xl bg-brand-50 p-4">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
            <div className="min-w-0 text-sm text-brand-900">
              <p>{app.next_step || "—"}</p>
              {app.next_step_date && (
                <p className="mt-0.5 text-xs text-brand-600">
                  {formatDate(app.next_step_date)}
                </p>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* Notes */}
      {app.notes && (
        <Section icon={StickyNote} title="Notes">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
            {app.notes}
          </p>
        </Section>
      )}

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-brand-100 pt-4">
        <DeleteButton
          onConfirm={() => {
            setError(null);
            startTransition(async () => {
              const res = await deleteApplication(app.id);
              if (res.error) {
                setError(res.error);
                return;
              }
              onClose();
            });
          }}
        />
        <Button
          onClick={() => {
            scrollModalToTop();
            onEdit();
          }}
        >
          Edit application
        </Button>
      </div>
    </div>
  );
}
