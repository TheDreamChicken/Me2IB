"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Briefcase,
  CalendarDays,
  Check,
  Clock,
  Copy,
  ListChecks,
  MapPin,
  Pencil,
  Plus,
} from "lucide-react";
import type { Experience } from "@/lib/types";
import { ROLE_TYPES, labelFor } from "@/lib/constants";
import { deleteExperience, upsertExperience } from "@/lib/actions/experiences";
import {
  Badge,
  Button,
  Card,
  DeleteButton,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatCard,
  Textarea,
  cn,
} from "@/components/ui";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const ROLE_TYPE_COLORS: Record<string, string> = {
  internship: "bg-purple-100 text-purple-700",
  job: "bg-blue-100 text-blue-700",
  club: "bg-amber-100 text-amber-700",
  project: "bg-cyan-100 text-cyan-700",
  research: "bg-indigo-100 text-indigo-700",
  volunteer: "bg-emerald-100 text-emerald-700",
};

function formatMonth(date: string | null): string | null {
  if (!date) return null;
  const [y, m] = date.split("-").map(Number);
  if (!y || !m) return null;
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function dateRange(exp: Experience): string {
  const start = formatMonth(exp.start_date);
  const end = exp.is_current ? "Present" : formatMonth(exp.end_date);
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  if (end) return end;
  return "";
}

function parseBullets(bullets: string | null): string[] {
  return (bullets ?? "")
    .split("\n")
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);
}

/** Current roles first, then most recent (end date, falling back to start). */
function sortExperiences(list: Experience[]): Experience[] {
  const key = (e: Experience) =>
    e.end_date ?? e.start_date ?? e.created_at.slice(0, 10);
  return [...list].sort((a, b) => {
    if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
    return key(b).localeCompare(key(a));
  });
}

function compiledPlainText(list: Experience[]): string {
  return list
    .map((exp) => {
      const header =
        [exp.title, exp.organization].filter(Boolean).join(", ") +
        (exp.location ? ` — ${exp.location}` : "");
      const lines = [header];
      const range = dateRange(exp);
      if (range) lines.push(range);
      for (const b of parseBullets(exp.bullets)) lines.push(`- ${b}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

/* ------------------------------------------------------------------ */
/* Add / edit form                                                     */
/* ------------------------------------------------------------------ */

function ExperienceForm({
  experience,
  onDone,
}: {
  experience: Experience | null;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [isCurrent, setIsCurrent] = useState(experience?.is_current ?? false);

  function submit(formData: FormData) {
    startTransition(async () => {
      const res = await upsertExperience(formData);
      if (res.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <form action={submit} className="space-y-4">
      {experience && <input type="hidden" name="id" value={experience.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title *">
          <Input
            name="title"
            placeholder="Investment Banking Summer Analyst"
            defaultValue={experience?.title}
            required
            autoFocus
          />
        </Field>
        <Field label="Organization">
          <Input
            name="organization"
            placeholder="Company, club, or school"
            defaultValue={experience?.organization ?? ""}
          />
        </Field>
        <Field label="Type">
          <Select
            name="role_type"
            defaultValue={experience?.role_type ?? "internship"}
          >
            {ROLE_TYPES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Location">
          <Input
            name="location"
            placeholder="New York, NY"
            defaultValue={experience?.location ?? ""}
          />
        </Field>
        <Field label="Start date">
          <Input
            name="start_date"
            type="date"
            defaultValue={experience?.start_date ?? ""}
          />
        </Field>
        <Field label="End date">
          <Input
            name="end_date"
            type="date"
            disabled={isCurrent}
            className={cn(isCurrent && "opacity-50")}
            defaultValue={experience?.end_date ?? ""}
          />
        </Field>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-brand-900">
        <input
          type="checkbox"
          name="is_current"
          checked={isCurrent}
          onChange={(e) => setIsCurrent(e.target.checked)}
          className="accent-brand-600"
        />
        I&apos;m currently in this role
      </label>

      <Field label="Description" hint="What the role or project is, in a sentence or two.">
        <Textarea
          name="description"
          placeholder="Sourcing arm of the student-run investment fund..."
          defaultValue={experience?.description ?? ""}
        />
      </Field>
      <Field
        label="Bullets (one per line)"
        hint="Start with strong verbs + numbers: 'Built a 3-statement model...', 'Grew membership 40%...'"
      >
        <Textarea
          name="bullets"
          rows={5}
          placeholder={"Analyzed 12 comparable companies to value a $50M target\nLed a 4-person team through weekly pitch prep"}
          defaultValue={experience?.bullets ?? ""}
        />
      </Field>
      <Field label="Skills" hint="Comma-separated, e.g. Excel, DCF modeling, PowerPoint">
        <Input name="skills" defaultValue={experience?.skills?.join(", ") ?? ""} />
      </Field>

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
          {pending ? <Spinner /> : experience ? "Save changes" : "Add experience"}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline card                                                       */
/* ------------------------------------------------------------------ */

function ExperienceCard({
  experience,
  onEdit,
}: {
  experience: Experience;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const bullets = parseBullets(experience.bullets);
  const range = dateRange(experience);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-brand-900">{experience.title}</h3>
            <Badge
              className={
                ROLE_TYPE_COLORS[experience.role_type] ??
                "bg-zinc-100 text-zinc-600"
              }
            >
              {labelFor(ROLE_TYPES, experience.role_type)}
            </Badge>
          </div>
          {experience.organization && (
            <p className="mt-0.5 text-sm text-zinc-500">
              {experience.organization}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
            {range && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {range}
              </span>
            )}
            {experience.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {experience.location}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="secondary" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          {pending ? (
            <Button size="sm" variant="danger" disabled>
              <Spinner />
            </Button>
          ) : (
            <DeleteButton
              onConfirm={() => {
                setError(null);
                startTransition(async () => {
                  const res = await deleteExperience(experience.id);
                  if (res.error) setError(res.error);
                });
              }}
            />
          )}
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      {experience.description && (
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          {experience.description}
        </p>
      )}
      {bullets.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-brand-900">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
      {experience.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {experience.skills.map((s) => (
            <Badge key={s} className="bg-brand-50 text-brand-600">
              {s}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Compiled resume-style view                                          */
/* ------------------------------------------------------------------ */

function CompiledView({ experiences }: { experiences: Experience[] }) {
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(compiledPlainText(experiences));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — nothing to do.
    }
  }

  return (
    <Card className="bg-white p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 pb-4">
        <p className="text-sm text-zinc-500">
          Paste this into your resume drafts or send to a mentor.
        </p>
        <Button size="sm" variant="secondary" onClick={copyAll}>
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy all
            </>
          )}
        </Button>
      </div>

      <div className="space-y-6">
        {experiences.map((exp) => {
          const bullets = parseBullets(exp.bullets);
          const range = dateRange(exp);
          return (
            <div key={exp.id}>
              <p className="text-sm text-brand-900">
                <span className="font-semibold">{exp.title}</span>
                {exp.organization && <>, {exp.organization}</>}
                {exp.location && (
                  <span className="text-zinc-500"> — {exp.location}</span>
                )}
              </p>
              {range && (
                <p className="text-xs italic text-zinc-500">{range}</p>
              )}
              {bullets.length > 0 && (
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-zinc-700">
                  {bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function ExperienceView({ experiences }: { experiences: Experience[] }) {
  const [mode, setMode] = useState<"timeline" | "compiled">("timeline");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Experience | null>(null);

  const sorted = useMemo(() => sortExperiences(experiences), [experiences]);
  const current = sorted.filter((e) => e.is_current);
  const past = sorted.filter((e) => !e.is_current);
  const totalBullets = experiences.reduce(
    (sum, e) => sum + parseBullets(e.bullets).length,
    0
  );

  return (
    <div>
      <PageHeader
        title="Experience"
        description="Everything you've done, ready to become resume lines."
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add experience
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Experiences logged"
          value={experiences.length}
          icon={<Briefcase className="h-5 w-5" />}
        />
        <StatCard
          label="Current roles"
          value={current.length}
          sub={current.length ? "Keep logging as you go" : "Nothing active right now"}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="Resume bullets banked"
          value={totalBullets}
          sub="Across all entries"
          icon={<ListChecks className="h-5 w-5" />}
        />
      </div>

      {/* Mode toggle */}
      <div className="mb-4 inline-flex rounded-xl border border-brand-200 bg-white p-1">
        {(
          [
            { value: "timeline", label: "Timeline" },
            { value: "compiled", label: "Compiled" },
          ] as const
        ).map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMode(m.value)}
            className={cn(
              "cursor-pointer rounded-lg px-4 py-1.5 text-xs font-medium transition-colors",
              mode === m.value
                ? "bg-brand-600 text-white shadow-sm"
                : "text-brand-700 hover:bg-brand-50"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {experiences.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-10 w-10" />}
          title="No experience logged yet"
          hint="Log everything you do — clubs, projects, jobs. Future-you writing resumes will be grateful."
          action={
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Log your first experience
            </Button>
          }
        />
      ) : mode === "compiled" ? (
        <CompiledView experiences={sorted} />
      ) : (
        <div className="space-y-6">
          {current.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-400">
                Current
              </p>
              <div className="space-y-3">
                {current.map((e) => (
                  <ExperienceCard
                    key={e.id}
                    experience={e}
                    onEdit={() => setEditing(e)}
                  />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-400">
                Past
              </p>
              <div className="space-y-3">
                {past.map((e) => (
                  <ExperienceCard
                    key={e.id}
                    experience={e}
                    onEdit={() => setEditing(e)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add */}
      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add experience"
        wide
      >
        <ExperienceForm experience={null} onDone={() => setAdding(false)} />
      </Modal>

      {/* Edit */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit experience"
        wide
      >
        {editing && (
          <ExperienceForm
            experience={editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
