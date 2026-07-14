"use client";

import { useState, useTransition } from "react";
import type { Application, Contact } from "@/lib/types";
import {
  APPLICATION_STATUSES,
  INDUSTRIES,
  MATERIAL_STATUSES,
  PRIORITIES,
  SECTORS,
  TIERS,
} from "@/lib/constants";
import { upsertApplication } from "@/lib/actions/applications";
import {
  Button,
  Field,
  Input,
  Select,
  Spinner,
  Textarea,
} from "@/components/ui";

const WORK_TYPES = [
  { value: "in-person", label: "In-person" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
];

const EMPLOYMENT_TYPES = [
  { value: "internship", label: "Internship" },
  { value: "full-time", label: "Full-time" },
  { value: "externship", label: "Externship" },
  { value: "program", label: "Program" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-brand-100 pb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-400">
      {children}
    </p>
  );
}

export function ApplicationForm({
  application,
  contacts,
  onDone,
}: {
  application: Application | null;
  contacts: Contact[];
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [industry, setIndustry] = useState(application?.industry ?? "finance");

  const sectorOptions = SECTORS[industry];
  const tierOptions = TIERS[industry];

  function submit(formData: FormData) {
    startTransition(async () => {
      const res = await upsertApplication(formData);
      if (res.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <form action={submit} className="space-y-5">
      {application && (
        <input type="hidden" name="id" value={application.id} />
      )}

      {/* ---- The role ---- */}
      <SectionLabel>The role</SectionLabel>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company *">
          <Input
            name="company"
            defaultValue={application?.company}
            required
            autoFocus
          />
        </Field>
        <Field label="Position">
          <Input
            name="position"
            placeholder="Investment Banking Summer Analyst"
            defaultValue={application?.position ?? ""}
          />
        </Field>
        <Field label="Industry">
          <Select
            name="industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          >
            {INDUSTRIES.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sector / coverage group">
          {sectorOptions ? (
            <Select name="sector" defaultValue={application?.sector ?? ""}>
              <option value="">—</option>
              {sectorOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              {application?.sector &&
                !sectorOptions.includes(application.sector) && (
                  <option value={application.sector}>
                    {application.sector}
                  </option>
                )}
            </Select>
          ) : (
            <Input
              name="sector"
              placeholder="e.g. Growth marketing, Supply chain..."
              defaultValue={application?.sector ?? ""}
            />
          )}
        </Field>
        {tierOptions && (
          <Field label="Tier">
            <Select name="tier" defaultValue={application?.tier ?? ""}>
              <option value="">—</option>
              {tierOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Location">
          <Input
            name="location"
            placeholder="New York, NY"
            defaultValue={application?.location ?? ""}
          />
        </Field>
        <Field label="Work type">
          <Select name="work_type" defaultValue={application?.work_type ?? ""}>
            <option value="">—</option>
            {WORK_TYPES.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Employment type">
          <Select
            name="employment_type"
            defaultValue={application?.employment_type ?? "internship"}
          >
            {EMPLOYMENT_TYPES.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Season" hint={'e.g. "Summer 2027"'}>
          <Input
            name="season"
            placeholder="Summer 2027"
            defaultValue={application?.season ?? ""}
          />
        </Field>
        <Field label="Hours / week">
          <Input
            name="hours_per_week"
            placeholder="40"
            defaultValue={application?.hours_per_week ?? ""}
          />
        </Field>
        <Field label="Pay">
          <Input
            name="pay"
            placeholder="$25/hr, $110k..."
            defaultValue={application?.pay ?? ""}
          />
        </Field>
      </div>

      {/* ---- Status & timeline ---- */}
      <SectionLabel>Status &amp; timeline</SectionLabel>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status">
          <Select
            name="status"
            defaultValue={application?.status ?? "not_started"}
          >
            {APPLICATION_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority">
          <Select
            name="priority"
            defaultValue={application?.priority ?? "target"}
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Deadline">
          <Input
            name="deadline"
            type="date"
            defaultValue={application?.deadline ?? ""}
          />
        </Field>
        <Field label="Date applied">
          <Input
            name="date_applied"
            type="date"
            defaultValue={application?.date_applied ?? ""}
          />
        </Field>
        <Field label="Next step">
          <Input
            name="next_step"
            placeholder="Send thank-you note, prep for OA..."
            defaultValue={application?.next_step ?? ""}
          />
        </Field>
        <Field label="Next step date">
          <Input
            name="next_step_date"
            type="date"
            defaultValue={application?.next_step_date ?? ""}
          />
        </Field>
      </div>

      {/* ---- Links & referral ---- */}
      <SectionLabel>Links &amp; referral</SectionLabel>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Application link" hint="Where you apply / check status.">
          <Input
            name="application_link"
            placeholder="https://..."
            defaultValue={application?.application_link ?? ""}
          />
        </Field>
        <Field label="Posting link">
          <Input
            name="posting_link"
            placeholder="https://..."
            defaultValue={application?.posting_link ?? ""}
          />
        </Field>
        <Field label="Referral contact">
          <Select
            name="referral_contact_id"
            defaultValue={application?.referral_contact_id ?? ""}
          >
            <option value="">— None —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.company ? ` (${c.company})` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm text-brand-900">
          <input
            type="checkbox"
            name="networked"
            defaultChecked={application?.networked ?? false}
            className="h-4 w-4 accent-brand-600"
          />
          I&apos;ve networked here
        </label>
      </div>

      {/* ---- Materials ---- */}
      <SectionLabel>Materials</SectionLabel>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Resume status">
          <Select
            name="resume_status"
            defaultValue={application?.resume_status ?? "not_started"}
          >
            {MATERIAL_STATUSES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cover letter status">
          <Select
            name="cover_letter_status"
            defaultValue={application?.cover_letter_status ?? "not_required"}
          >
            {MATERIAL_STATUSES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Materials needed" hint="Transcript, writing sample...">
          <Input
            name="materials_needed"
            defaultValue={application?.materials_needed ?? ""}
          />
        </Field>
        <Field label="Missing items">
          <Input
            name="missing_items"
            defaultValue={application?.missing_items ?? ""}
          />
        </Field>
      </div>

      {/* ---- Notes & prep ---- */}
      <SectionLabel>Notes &amp; prep</SectionLabel>
      <div className="space-y-4">
        <Field label="Open questions" hint="Things to figure out or ask about.">
          <Textarea
            name="open_questions"
            defaultValue={application?.open_questions ?? ""}
          />
        </Field>
        <Field label="Interview notes">
          <Textarea
            name="interview_notes"
            defaultValue={application?.interview_notes ?? ""}
          />
        </Field>
        <Field label="Notes">
          <Textarea name="notes" defaultValue={application?.notes ?? ""} />
        </Field>
      </div>

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : application ? "Save changes" : "Add application"}
        </Button>
      </div>
    </form>
  );
}
