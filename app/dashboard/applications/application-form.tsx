"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
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
import { callAI } from "@/lib/ai-client";
import {
  Button,
  Field,
  Input,
  Select,
  Spinner,
  Textarea,
  cn,
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

const STEPS = [
  {
    title: "The basics",
    blurb: "Company and role — only the company name is a must-have.",
  },
  {
    title: "Role details",
    blurb: "The logistics. Totally fine to skip what you don't know yet.",
  },
  {
    title: "Where you're at",
    blurb: "Status, key dates, and which materials still need love.",
  },
  {
    title: "Links & notes",
    blurb: "Links, people, and a little brain-dump space.",
  },
] as const;

/* ------------------------------------------------------------------ */
/* Form state                                                          */
/* ------------------------------------------------------------------ */

type FormValues = {
  company: string;
  position: string;
  industry: string;
  sector: string;
  tier: string;
  season: string;
  priority: string;
  location: string;
  work_type: string;
  employment_type: string;
  hours_per_week: string;
  pay: string;
  status: string;
  deadline: string;
  date_applied: string;
  resume_status: string;
  cover_letter_status: string;
  materials_needed: string;
  missing_items: string;
  application_link: string;
  posting_link: string;
  referral_contact_id: string;
  networked: boolean;
  next_step: string;
  next_step_date: string;
  open_questions: string;
  interview_notes: string;
  notes: string;
};

function initialValues(app: Application | null): FormValues {
  return {
    company: app?.company ?? "",
    position: app?.position ?? "",
    industry: app?.industry ?? "finance",
    sector: app?.sector ?? "",
    tier: app?.tier ?? "",
    season: app?.season ?? "",
    priority: app?.priority ?? "target",
    location: app?.location ?? "",
    work_type: app?.work_type ?? "",
    employment_type: app?.employment_type ?? "internship",
    hours_per_week: app?.hours_per_week ?? "",
    pay: app?.pay ?? "",
    status: app?.status ?? "not_started",
    deadline: app?.deadline ?? "",
    date_applied: app?.date_applied ?? "",
    resume_status: app?.resume_status ?? "not_started",
    cover_letter_status: app?.cover_letter_status ?? "not_required",
    materials_needed: app?.materials_needed ?? "",
    missing_items: app?.missing_items ?? "",
    application_link: app?.application_link ?? "",
    posting_link: app?.posting_link ?? "",
    referral_contact_id: app?.referral_contact_id ?? "",
    networked: app?.networked ?? false,
    next_step: app?.next_step ?? "",
    next_step_date: app?.next_step_date ?? "",
    open_questions: app?.open_questions ?? "",
    interview_notes: app?.interview_notes ?? "",
    notes: app?.notes ?? "",
  };
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

type JobPostingAutofill = Partial<
  Pick<
    FormValues,
    | "company"
    | "position"
    | "industry"
    | "location"
    | "work_type"
    | "employment_type"
    | "season"
    | "pay"
    | "deadline"
    | "posting_link"
    | "application_link"
  >
> & { error?: string };

type ScannedPosting = {
  title: string;
  company?: string | null;
  industry?: string | null;
  location?: string | null;
  link?: string | null;
  deadline?: string | null;
};

function seasonFromTitle(title: string): string | undefined {
  const match = title.match(/\b(spring|summer|fall|autumn|winter)\b(?:\s+(20\d{2}))?/i);
  if (!match) return undefined;
  const raw = match[1].toLowerCase() === "autumn" ? "fall" : match[1].toLowerCase();
  const name = raw[0].toUpperCase() + raw.slice(1);
  const year = match[2] ?? title.match(/\b20\d{2}\b/)?.[0];
  return `${name}${year ? ` ${year}` : ""}`;
}

function AutofillFromPosting({
  onFill,
}: {
  onFill: (data: JobPostingAutofill) => void;
}) {
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function autofill() {
    const postingUrl = url.trim();
    if (!postingUrl) return;
    setError(null);
    setDone(false);
    startTransition(async () => {
      let directError: string | null = null;
      try {
        const response = await fetch(
          `/dashboard/applications/job-posting?url=${encodeURIComponent(postingUrl)}`
        );
        const data = (await response.json()) as JobPostingAutofill;
        if (response.ok && !data.error && data.company?.trim() && data.position?.trim()) {
          onFill(data);
          setDone(true);
          return;
        }
        directError = data.error ?? "The job site blocked direct reading.";
      } catch {
        directError = "The job site blocked direct reading.";
      }

      const fallback = await callAI<ScannedPosting[]>("opportunities", {
        industries: [],
        location: "Use the location published in the posting",
        keywords: `Inspect this exact job posting URL and return this specific role only: ${postingUrl}`,
      });
      if (fallback.setup) {
        setError(fallback.setup);
        return;
      }
      if (fallback.error || fallback.upgrade) {
        setError(fallback.error ?? directError ?? "Couldn't read that posting.");
        return;
      }
      const match = fallback.data?.find(
        (item) => item && typeof item.title === "string" && item.title.trim()
      );
      if (!match) {
        setError(directError ?? "Couldn't find job details at that link.");
        return;
      }
      const title = match.title.trim();
      const lower = title.toLowerCase();
      onFill({
        company: match.company ?? undefined,
        position: title,
        industry: match.industry ?? undefined,
        location: match.location ?? undefined,
        work_type: lower.includes("remote") ? "remote" : undefined,
        employment_type: lower.includes("intern") ? "internship" : undefined,
        season: seasonFromTitle(title),
        deadline: match.deadline ?? undefined,
        posting_link: match.link ?? postingUrl,
        application_link: match.link ?? postingUrl,
      });
      setDone(true);
    });
  }

  return (
    <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/70 p-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-brand-400" />
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste the direct job posting link"
          className="bg-white text-xs"
          aria-label="Autofill from a job posting link"
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={autofill}
          disabled={pending || !url.trim()}
        >
          {pending ? <Spinner /> : <Sparkles className="h-3.5 w-3.5" />}
          Autofill
        </Button>
      </div>
      {done && !pending && (
        <p className="mt-2 text-xs text-emerald-600">
          Filled the fields published with the posting — give them a quick check.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function StepHeader({
  step,
  onGo,
}: {
  step: number;
  onGo: (target: number) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-brand-400">
          {step + 1} of {STEPS.length}
        </p>
        <h3 className="text-base font-semibold text-brand-900">
          {STEPS[step].title}
        </h3>
        <p className="mt-0.5 text-xs text-zinc-400">{STEPS[step].blurb}</p>
      </div>
      <div className="mt-1 flex shrink-0 items-center gap-1.5">
        {STEPS.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => onGo(i)}
            aria-label={`Go to step ${i + 1}: ${s.title}`}
            aria-current={i === step ? "step" : undefined}
            className={cn(
              "h-2 cursor-pointer rounded-full transition-all",
              i === step
                ? "w-6 bg-brand-600"
                : "w-2 bg-brand-200 hover:bg-brand-400"
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form                                                                */
/* ------------------------------------------------------------------ */

export function ApplicationForm({
  application,
  contacts,
  onDone,
}: {
  application: Application | null;
  contacts: Contact[];
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>(() =>
    initialValues(application)
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sectorOptions = SECTORS[values.industry];
  const tierOptions = TIERS[values.industry];
  const lastStep = step === STEPS.length - 1;

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  /** Industry drives sector/tier options — drop values that no longer fit. */
  function changeIndustry(industry: string) {
    setValues((v) => {
      const nextSectors = SECTORS[industry];
      const nextTiers = TIERS[industry];
      return {
        ...v,
        industry,
        sector:
          nextSectors && !nextSectors.includes(v.sector) ? "" : v.sector,
        tier:
          nextTiers && nextTiers.some((t) => t.value === v.tier) ? v.tier : "",
      };
    });
  }

  function applyAutofill(data: JobPostingAutofill) {
    setValues((current) => {
      const next = { ...current };
      const textKeys = [
        "company",
        "position",
        "location",
        "season",
        "pay",
        "deadline",
        "posting_link",
        "application_link",
      ] as const;
      for (const key of textKeys) {
        const value = data[key];
        if (typeof value === "string" && value.trim()) next[key] = value.trim();
      }
      if (
        typeof data.work_type === "string" &&
        WORK_TYPES.some((item) => item.value === data.work_type)
      ) {
        next.work_type = data.work_type;
      }
      if (
        typeof data.employment_type === "string" &&
        EMPLOYMENT_TYPES.some((item) => item.value === data.employment_type)
      ) {
        next.employment_type = data.employment_type;
      }
      if (
        typeof data.industry === "string" &&
        INDUSTRIES.some((item) => item.value === data.industry)
      ) {
        next.industry = data.industry;
        const nextSectors = SECTORS[data.industry];
        const nextTiers = TIERS[data.industry];
        if (nextSectors && !nextSectors.includes(next.sector)) next.sector = "";
        if (nextTiers && !nextTiers.some((item) => item.value === next.tier)) {
          next.tier = "";
        }
      }
      return next;
    });
    setError(null);
  }

  function goTo(target: number) {
    if (target > 0 && !values.company.trim()) {
      setStep(0);
      setError("Add the company name first — it's the only must-have.");
      return;
    }
    setError(null);
    setStep(Math.max(0, Math.min(STEPS.length - 1, target)));
  }

  /** One FormData at the very end — field names match upsertApplication. */
  function buildFormData(): FormData {
    const fd = new FormData();
    if (application) fd.set("id", application.id);
    for (const [key, value] of Object.entries(values)) {
      if (key === "networked") continue;
      if (key === "tier" && !tierOptions) continue; // no tiers for this industry
      fd.set(key, value as string);
    }
    if (values.networked) fd.set("networked", "on");
    return fd;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!lastStep) {
      goTo(step + 1);
      return;
    }
    if (!values.company.trim()) {
      goTo(0);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await upsertApplication(buildFormData());
      if (res.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <StepHeader step={step} onGo={goTo} />

      {/* ---- Step 1: The basics ---- */}
      {step === 0 && (
        <div className="space-y-4">
          <AutofillFromPosting onFill={applyAutofill} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company *">
              <Input
                name="company"
                value={values.company}
                onChange={(e) => set("company", e.target.value)}
                autoFocus
              />
            </Field>
            <Field label="Position">
              <Input
                name="position"
                placeholder="Investment Banking Summer Analyst"
                value={values.position}
                onChange={(e) => set("position", e.target.value)}
              />
            </Field>
            <Field label="Industry">
              <Select
                name="industry"
                value={values.industry}
                onChange={(e) => changeIndustry(e.target.value)}
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
                <Select
                  name="sector"
                  value={values.sector}
                  onChange={(e) => set("sector", e.target.value)}
                >
                  <option value="">—</option>
                  {sectorOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  {values.sector && !sectorOptions.includes(values.sector) && (
                    <option value={values.sector}>{values.sector}</option>
                  )}
                </Select>
              ) : (
                <Input
                  name="sector"
                  placeholder="e.g. Growth marketing, Supply chain..."
                  value={values.sector}
                  onChange={(e) => set("sector", e.target.value)}
                />
              )}
            </Field>
            {tierOptions && (
              <Field label="Tier">
                <Select
                  name="tier"
                  value={values.tier}
                  onChange={(e) => set("tier", e.target.value)}
                >
                  <option value="">—</option>
                  {tierOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Season" hint={'e.g. "Summer 2027"'}>
              <Input
                name="season"
                placeholder="Summer 2027"
                value={values.season}
                onChange={(e) => set("season", e.target.value)}
              />
            </Field>
            <Field label="Priority" hint="Dream, target, or safety?">
              <Select
                name="priority"
                value={values.priority}
                onChange={(e) => set("priority", e.target.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      )}

      {/* ---- Step 2: Role details ---- */}
      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location">
            <Input
              name="location"
              placeholder="New York, NY"
              value={values.location}
              onChange={(e) => set("location", e.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Work type">
            <Select
              name="work_type"
              value={values.work_type}
              onChange={(e) => set("work_type", e.target.value)}
            >
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
              value={values.employment_type}
              onChange={(e) => set("employment_type", e.target.value)}
            >
              {EMPLOYMENT_TYPES.map((e2) => (
                <option key={e2.value} value={e2.value}>
                  {e2.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Hours / week">
            <Input
              name="hours_per_week"
              placeholder="40"
              value={values.hours_per_week}
              onChange={(e) => set("hours_per_week", e.target.value)}
            />
          </Field>
          <Field label="Pay">
            <Input
              name="pay"
              placeholder="$25/hr, $110k..."
              value={values.pay}
              onChange={(e) => set("pay", e.target.value)}
            />
          </Field>
        </div>
      )}

      {/* ---- Step 3: Where you're at ---- */}
      {step === 2 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <Select
              name="status"
              value={values.status}
              onChange={(e) => set("status", e.target.value)}
              autoFocus
            >
              {APPLICATION_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Deadline">
            <Input
              name="deadline"
              type="date"
              value={values.deadline}
              onChange={(e) => set("deadline", e.target.value)}
            />
          </Field>
          <Field label="Date applied">
            <Input
              name="date_applied"
              type="date"
              value={values.date_applied}
              onChange={(e) => set("date_applied", e.target.value)}
            />
          </Field>
          <Field label="Resume status">
            <Select
              name="resume_status"
              value={values.resume_status}
              onChange={(e) => set("resume_status", e.target.value)}
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
              value={values.cover_letter_status}
              onChange={(e) => set("cover_letter_status", e.target.value)}
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
              value={values.materials_needed}
              onChange={(e) => set("materials_needed", e.target.value)}
            />
          </Field>
          <Field label="Missing items">
            <Input
              name="missing_items"
              value={values.missing_items}
              onChange={(e) => set("missing_items", e.target.value)}
            />
          </Field>
        </div>
      )}

      {/* ---- Step 4: Links & notes ---- */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Application link"
              hint="Where you apply / check status."
            >
              <Input
                name="application_link"
                placeholder="https://..."
                value={values.application_link}
                onChange={(e) => set("application_link", e.target.value)}
                autoFocus
              />
            </Field>
            <Field label="Posting link">
              <Input
                name="posting_link"
                placeholder="https://..."
                value={values.posting_link}
                onChange={(e) => set("posting_link", e.target.value)}
              />
            </Field>
            <Field label="Referral contact">
              <Select
                name="referral_contact_id"
                value={values.referral_contact_id}
                onChange={(e) => set("referral_contact_id", e.target.value)}
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
                checked={values.networked}
                onChange={(e) => set("networked", e.target.checked)}
                className="h-4 w-4 accent-brand-600"
              />
              I&apos;ve networked here
            </label>
            <Field label="Next step">
              <Input
                name="next_step"
                placeholder="Send thank-you note, prep for OA..."
                value={values.next_step}
                onChange={(e) => set("next_step", e.target.value)}
              />
            </Field>
            <Field label="Next step date">
              <Input
                name="next_step_date"
                type="date"
                value={values.next_step_date}
                onChange={(e) => set("next_step_date", e.target.value)}
              />
            </Field>
          </div>
          <Field
            label="Open questions"
            hint="Things to figure out or ask about."
          >
            <Textarea
              name="open_questions"
              value={values.open_questions}
              onChange={(e) => set("open_questions", e.target.value)}
            />
          </Field>
          <Field label="Interview notes">
            <Textarea
              name="interview_notes"
              value={values.interview_notes}
              onChange={(e) => set("interview_notes", e.target.value)}
            />
          </Field>
          <Field label="Notes">
            <Textarea
              name="notes"
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-brand-100 pt-4">
        {step === 0 ? (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={() => goTo(step - 1)}
            disabled={pending}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        )}
        {lastStep ? (
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Spinner />
            ) : application ? (
              "Save changes"
            ) : (
              "Add application"
            )}
          </Button>
        ) : (
          <Button type="submit">
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
