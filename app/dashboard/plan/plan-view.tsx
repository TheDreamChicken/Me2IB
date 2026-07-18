"use client";

import { useEffect, useState, useTransition } from "react";
import Markdown from "react-markdown";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CheckCircle2,
  Compass,
  GraduationCap,
  Map,
  RefreshCw,
  Sparkles,
  Sun,
} from "lucide-react";
import type { Plan, Profile } from "@/lib/types";
import { INDUSTRIES, STANDINGS, labelFor } from "@/lib/constants";
import { saveAiPlan, savePlanProfile } from "@/lib/actions/plan-profile";
import { callAI } from "@/lib/ai-client";
import { useNow } from "@/components/use-today";
import { TierGate } from "@/components/tier-gate";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  cn,
} from "@/components/ui";
import { MONTH_NAMES, PHASE_STEPS, computeTimeline } from "./timeline-logic";

/* ------------------------------------------------------------------ */
/* Profile form                                                        */
/* ------------------------------------------------------------------ */

function PlanProfileForm({
  profile,
  now,
}: {
  profile: Profile | null;
  now: Date | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const savedIndustries = (profile?.target_industries ?? []).filter((value) =>
    INDUSTRIES.some((industry) => industry.value === value)
  );
  const [industries, setIndustries] = useState<string[]>(savedIndustries);

  // Old profile rows may still hold the retired "standard" value (or other
  // junk) — treat anything we don't recognize as unset.
  const savedStanding =
    profile?.standing && STANDINGS.some((s) => s.value === profile.standing)
      ? profile.standing
      : "";

  // Hydration-safe year options: before mount (now === null) only render the
  // saved grad year, then expand to the full list from the browser's clock.
  const years: number[] = now
    ? Array.from({ length: 7 }, (_, i) => now.getFullYear() + i)
    : [];
  if (profile?.grad_year && !years.includes(profile.grad_year)) {
    years.unshift(profile.grad_year);
  }

  function submit(formData: FormData) {
    if (industries.length === 0) {
      setError("Pick at least one target industry.");
      return;
    }
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await savePlanProfile(formData);
      if (res.error) setError(res.error);
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  function toggleIndustry(value: string) {
    setIndustries((current) =>
      current.includes(value)
        ? current.filter((industry) => industry !== value)
        : [...current, value]
    );
  }

  function moveIndustry(index: number, direction: -1 | 1) {
    setIndustries((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="rounded-xl bg-brand-100 p-2 text-brand-600">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-brand-900">Your starting point</h2>
          <p className="text-xs text-zinc-500">
            A few basics — everything below is computed from these.
          </p>
        </div>
      </div>

      <form
        key={profile ? profile.updated_at : "new"}
        onSubmit={(event) => {
          event.preventDefault();
          submit(new FormData(event.currentTarget));
        }}
        className="space-y-4"
      >
        {industries.map((industry) => (
          <input
            key={industry}
            type="hidden"
            name="target_industries"
            value={industry}
          />
        ))}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="School *">
            <Input
              name="school"
              placeholder="e.g. University of Michigan"
              defaultValue={profile?.school ?? ""}
              required
            />
          </Field>
          <Field label="Graduation month *">
            <Select
              name="grad_month"
              defaultValue={profile?.grad_month ? String(profile.grad_month) : ""}
              required
            >
              <option value="" disabled>
                Month…
              </option>
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Graduation year *">
            <Select
              name="grad_year"
              defaultValue={profile?.grad_year ? String(profile.grad_year) : ""}
              required
            >
              <option value="" disabled>
                Year…
              </option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Standing *">
            <Select name="standing" defaultValue={savedStanding} required>
              <option value="" disabled>
                Pick your standing…
              </option>
              {STANDINGS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <fieldset className="sm:col-span-2 lg:col-span-3">
            <legend className="text-xs font-medium text-brand-900/70">
              Target industries *
            </legend>
            <p className="mt-1 text-xs text-zinc-400">
              Check every path you&apos;re considering, then rank them so the AI
              knows what comes first.
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {INDUSTRIES.map((item) => {
                const checked = industries.includes(item.value);
                const rank = industries.indexOf(item.value) + 1;
                return (
                  <label
                    key={item.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                      checked
                        ? "border-brand-400 bg-brand-50 text-brand-900"
                        : "border-brand-100 bg-white text-zinc-500 hover:border-brand-300"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleIndustry(item.value)}
                      className="accent-brand-600"
                    />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {checked && (
                      <span className="text-[10px] font-semibold text-brand-500">
                        #{rank}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            {industries.length > 0 && (
              <div className="mt-3 space-y-1.5 rounded-xl bg-brand-50/70 p-3">
                {industries.map((value, index) => (
                  <div key={value} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-[11px] font-semibold text-brand-500">
                      Priority {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-sm text-brand-900">
                      {labelFor(INDUSTRIES, value)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="px-2"
                      onClick={() => moveIndustry(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${labelFor(INDUSTRIES, value)} up`}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="px-2"
                      onClick={() => moveIndustry(index, 1)}
                      disabled={index === industries.length - 1}
                      aria-label={`Move ${labelFor(INDUSTRIES, value)} down`}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </fieldset>
        </div>

        {error && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : "Save & update my plan"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Phase tracker                                                       */
/* ------------------------------------------------------------------ */

function PhaseTracker({ current }: { current: number }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-[560px] items-start gap-1.5">
        {PHASE_STEPS.map((p, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          return (
            <div key={p.value} className="flex-1">
              <div
                className={cn(
                  "h-2 rounded-full",
                  state === "done" && "bg-brand-300",
                  state === "current" && "bg-brand-600",
                  state === "todo" && "bg-brand-100"
                )}
              />
              <p
                className={cn(
                  "mt-1.5 text-center text-[11px] leading-tight",
                  state === "current"
                    ? "font-semibold text-brand-800"
                    : "text-zinc-400"
                )}
              >
                {p.label}
              </p>
              {state === "current" && (
                <p className="mt-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-brand-500">
                  You are here
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* "Where you stand" card                                              */
/* ------------------------------------------------------------------ */

function WhereYouStand({
  profile,
  contactsCount,
  applicationsCount,
  now,
  industry,
  priority,
}: {
  profile: Profile | null;
  contactsCount: number;
  applicationsCount: number;
  now: Date;
  industry: string | null;
  priority?: number;
}) {
  const ready = Boolean(profile?.grad_year && profile?.grad_month && industry);

  if (!ready || !profile) {
    return (
      <Card className="flex flex-col items-center gap-2 border-dashed p-8 text-center">
        <Compass className="h-8 w-8 text-brand-300" />
        <p className="font-medium text-brand-900">
          Your timeline will appear here
        </p>
        <p className="max-w-sm text-sm text-zinc-400">
          Save your graduation date and target industry above, and we&apos;ll
          map exactly where you are in the recruiting cycle — and what to do
          next.
        </p>
      </Card>
    );
  }

  const t = computeTimeline({
    gradYear: profile.grad_year!,
    gradMonth: profile.grad_month!,
    standing: profile.standing,
    industry: industry!,
    contactsCount,
    applicationsCount,
    now,
  });

  const stats = [
    {
      icon: CalendarClock,
      label: "Months to graduation",
      value: t.monthsUntilGrad >= 0 ? String(t.monthsUntilGrad) : "Graduated",
    },
    {
      icon: Sun,
      label: "Target internship summer",
      value: `Summer ${t.targetSummerYear}`,
    },
    {
      icon: GraduationCap,
      label: "Standing",
      value: labelFor(STANDINGS, t.resolvedStanding).split(" (")[0],
    },
  ];

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="rounded-xl bg-brand-100 p-2 text-brand-600">
          <Map className="h-5 w-5" />
        </div>
        <h2 className="font-semibold text-brand-900">
          Where you stand — {labelFor(INDUSTRIES, industry!)}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          {priority && (
            <Badge className="bg-brand-100 text-brand-700">
              Priority {priority}
            </Badge>
          )}
          <Badge className="bg-brand-600 text-white">
            {PHASE_STEPS[t.phaseIndex].label}
          </Badge>
        </div>
      </div>

      <p className="rounded-2xl bg-gradient-to-br from-brand-100 via-brand-50 to-white p-4 text-sm leading-relaxed text-brand-900">
        {t.headline}
      </p>

      <div className="my-5 grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-brand-50 p-3">
            <p className="flex items-center gap-1.5 text-xs text-zinc-500">
              <s.icon className="h-3.5 w-3.5 text-brand-400" />
              {s.label}
            </p>
            <p className="mt-1 text-lg font-semibold text-brand-900">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <PhaseTracker current={t.phaseIndex} />

      <p className="mt-4 text-xs leading-relaxed text-zinc-500">{t.cycleNote}</p>

      <div className="mt-5 border-t border-brand-100 pt-4">
        <h3 className="text-sm font-semibold text-brand-900">
          Your 3 most important moves right now
        </h3>
        <ol className="mt-3 space-y-2.5">
          {t.actions.map((a, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-zinc-600">{a}</p>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Static Recruiting 101 roadmap                                       */
/* ------------------------------------------------------------------ */

const ROADMAP: {
  badge: string;
  title: string;
  tagline: string;
  bullets: string[];
}[] = [
  {
    badge: "Year 1",
    title: "Freshman year",
    tagline: "Explore everything, commit to nothing",
    bullets: [
      "Join 1–2 business or career clubs (investment club, consulting club, marketing org) — the upperclassmen there are your first map of how this all works.",
      "Figure out what the industries actually are: banking, consulting, marketing, tech. Watching day-in-the-life videos and asking club members counts.",
      "Do a few coffee chats — a coffee chat is a relaxed 15–30 minute call where you ask someone about their job. You're learning, not asking for anything.",
      "Draft a simple one-page resume and keep your GPA up — it's the first filter recruiters apply.",
    ],
  },
  {
    badge: "Year 2 · Fall",
    title: "Sophomore fall",
    tagline: "Build the foundation",
    bullets: [
      "Grow your network deliberately: your school's alumni database, LinkedIn, and club alumni. Log everyone in the Contacts tab.",
      "Send cold emails — short, specific notes to people who don't know you yet, asking for 15 minutes. Most go unanswered; the ones that land change everything.",
      "Start technical prep if you're aiming at finance (accounting basics, valuation) or casing if consulting.",
      "Lock in some experience for the summer — a small firm, research, or a serious club project all count.",
    ],
  },
  {
    badge: "Year 2 · Spring",
    title: "Sophomore spring",
    tagline: "Go time — banking AND consulting",
    bullets: [
      "IB timing varies by firm: some junior-summer processes appear in sophomore winter or spring, while others open in summer or early junior fall. Track every target firm now and apply as soon as its window opens.",
      "Consulting now runs on the same clock: MBB applications for junior summer open this spring too, and sophomore/diversity programs open even earlier. If consulting's your lane, you should already be casing.",
      "Turn your best relationships into referrals — a referral means an employee formally recommends you, which can move your resume to the top of the pile.",
      "Get interview-ready before you submit: HireVues (recorded video interviews) and first rounds arrive fast — technicals for banking, live cases for consulting.",
    ],
  },
  {
    badge: "Year 3",
    title: "Junior fall & summer",
    tagline: "Decisions, late waves, and everything else",
    bullets: [
      "Banking and consulting decisions roll through junior fall — superdays, final case rounds, and late waves at firms still filling seats. No offer yet? Keep applying; spots open up every year.",
      "Marketing, tech, and ops recruit fall/winter, more just-in-time — watch OCR (on-campus recruiting: your school's career portal, fairs, and info sessions).",
      "If you landed a junior-summer internship, treat it like a 10-week interview — it's the single best path to a full-time offer.",
      "Build your behavioral story bank: leadership, teamwork, failure, and “why this industry.”",
    ],
  },
  {
    badge: "Year 4",
    title: "Senior year",
    tagline: "Convert and close",
    bullets: [
      "Return offer in hand? Compare it honestly before accepting. No return offer? Full-time recruiting kicks off in the fall — lean on your network hard.",
      "Superdays — the final round, several back-to-back interviews in one day — reward stamina; schedule prep sprints before each one.",
      "Keep applying: off-cycle and just-in-time roles open all year, especially at boutiques and smaller firms.",
      "Send thank-yous and keep your contacts warm. The network you built is a career asset, not just a recruiting tool.",
    ],
  },
];

function Roadmap101() {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-brand-900">
          Recruiting 101 — the full roadmap
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">
          The honest version of how competitive recruiting works, year by year.
          Behind on this timeline? So is almost everyone — start where you are.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ROADMAP.map((stage) => (
          <Card key={stage.title} className="p-5">
            <Badge>{stage.badge}</Badge>
            <h3 className="mt-2.5 font-semibold text-brand-900">
              {stage.title}
            </h3>
            <p className="text-xs font-medium text-brand-500">
              {stage.tagline}
            </p>
            <ul className="mt-3 space-y-2">
              {stage.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" />
                  <p className="text-sm leading-relaxed text-zinc-600">{b}</p>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* AI roadmap (heat tier)                                              */
/* ------------------------------------------------------------------ */

const LONG_PLAN_CHARS = 3000;

function AiPlanSection({
  profile,
  contactsCount,
  applicationsCount,
  plan,
}: {
  profile: Profile | null;
  contactsCount: number;
  applicationsCount: number;
  plan: Plan | null;
}) {
  const [pending, startTransition] = useTransition();
  const [setup, setSetup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Freshly generated plan, shown immediately while revalidation catches up.
  const [fresh, setFresh] = useState<{ markdown: string; at: string } | null>(
    null
  );
  const [expanded, setExpanded] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [pending]);

  const markdown = fresh?.markdown ?? plan?.plan_markdown ?? null;
  const generatedAt = fresh?.at ?? plan?.updated_at ?? null;
  const isLong = (markdown?.length ?? 0) > LONG_PLAN_CHARS;
  const planProfileMismatch = Boolean(
    !fresh &&
      plan &&
      profile &&
      (plan.target_industry !==
        (profile.target_industries?.[0] ?? null) ||
        plan.grad_year !== profile.grad_year ||
        plan.grad_month !== profile.grad_month ||
        plan.standing !== profile.standing)
  );

  const profileReady = Boolean(
    profile?.school?.trim() &&
      profile?.grad_year &&
      profile?.grad_month &&
      profile?.standing &&
      profile?.target_industries?.length
  );
  const missingProfileFields = [
    !profile?.school?.trim() && "school",
    !profile?.grad_month && "graduation month",
    !profile?.grad_year && "graduation year",
    !profile?.standing && "year standing",
    !profile?.target_industries?.length && "at least one target industry",
  ].filter(Boolean) as string[];

  function generate() {
    if (!profileReady) return;
    setElapsed(0);
    setError(null);
    setSetup(null);
    startTransition(async () => {
      let profilePayload: Record<string, unknown> = {};
      let timelineAnchors: Record<string, unknown>[] = [];
      if (profile) {
        // Explicitly whitelist recruiting context; identifiers and account
        // metadata have no business going to the model.
        profilePayload = {
          school: profile.school,
          majors: profile.majors,
          minors: profile.minors,
          certificates: profile.certificates,
          grad_year: profile.grad_year,
          grad_month: profile.grad_month,
          standing: profile.standing,
          gpa: profile.gpa,
          city: profile.city,
          clubs: profile.clubs,
          professional_summary: profile.professional_summary,
          personal_interests: profile.personal_interests,
          fun_facts: profile.fun_facts,
          target_industry_priorities: profile.target_industries.map(
            (value, index) => ({
              rank: index + 1,
              industry: labelFor(INDUSTRIES, value),
            })
          ),
        };

        if (profile.grad_year && profile.grad_month) {
          const generatedNow = new Date();
          timelineAnchors = profile.target_industries.map((industry) => {
            const timeline = computeTimeline({
              gradYear: profile.grad_year!,
              gradMonth: profile.grad_month!,
              standing: profile.standing,
              industry,
              contactsCount,
              applicationsCount,
              now: generatedNow,
            });
            return {
              industry: labelFor(INDUSTRIES, industry),
              target_internship_summer: timeline.targetSummerYear,
              applications_watch_window_starts: timeline.appsOpenLabel,
              major_windows_can_run_through: timeline.appsCloseLabel,
              current_phase: timeline.phase,
              timing_note: timeline.cycleNote,
            };
          });
        }
      }

      const res = await callAI("plan", {
        profile: profilePayload,
        stats: { contactsCount, applicationsCount },
        timelineAnchors,
      });
      if (res.setup) {
        setSetup(res.setup);
        return;
      }
      if (res.upgrade) {
        // The TierGate should catch this first — belt and suspenders.
        setError(
          res.error ??
            `This needs the ${res.upgrade.neededLabel} plan — upgrade in Account → Plan.`
        );
        return;
      }
      if (res.error) {
        setError(res.error);
        return;
      }
      const text = res.text?.trim();
      if (!text) {
        setError("No plan came back — try again.");
        return;
      }

      setFresh({ markdown: text, at: new Date().toISOString() });
      setExpanded(false);
      const saved = await saveAiPlan(text, {
        target_industry: profile?.target_industries?.[0] ?? null,
        grad_year: profile?.grad_year ?? null,
        grad_month: profile?.grad_month ?? null,
        standing: profile?.standing ?? null,
      });
      if (saved.error) {
        setError(
          `Your plan is ready below, but it couldn't be saved and won't survive a reload: ${saved.error}`
        );
      }
    });
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="rounded-xl bg-brand-100 p-2 text-brand-600">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-brand-900">Your AI roadmap</h2>
          <p className="text-xs text-zinc-500">
            {markdown && generatedAt
              ? `Generated ${new Date(generatedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC", // pin it: SSR and client must agree on the day
                })}`
              : "A month-by-month plan built from your actual tracker, school, and timeline."}
          </p>
        </div>
        <Button
          onClick={generate}
          disabled={pending || !profileReady}
          variant={markdown ? "secondary" : "primary"}
          size={markdown ? "sm" : "md"}
        >
          {pending ? (
            <Spinner />
          ) : markdown ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" /> Regenerate
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Generate my plan
            </>
          )}
        </Button>
      </div>

      {!profileReady && !pending && (
        <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2 text-xs text-zinc-500">
          Complete and save {missingProfileFields.join(", ")} above to unlock
          AI generation. Your industry order becomes the roadmap priority order.
        </div>
      )}

      {planProfileMismatch && !pending && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          Your recruiting inputs have changed since this roadmap was generated.
          Regenerate it to use your current graduation date, standing, and
          industry priorities.
        </div>
      )}

      {pending && (
        <div className="mt-4 flex items-start gap-3 rounded-xl bg-brand-50 p-4">
          <Spinner className="mt-0.5" />
          <div>
            <p className="text-sm font-medium text-brand-900">
              Writing your month-by-month roadmap…
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
              This genuinely takes a minute or two — it reads your timeline and
              tracker stats and writes the whole plan in one go. {elapsed}s so
              far.
            </p>
          </div>
        </div>
      )}

      {setup && (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 text-sm leading-relaxed text-brand-700">
          <span className="font-medium">
            AI isn&apos;t set up yet — one quick step:
          </span>{" "}
          {setup}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      {markdown && (
        <div className="mt-4">
          <div
            className={cn(
              "relative",
              isLong && !expanded && "max-h-[30rem] overflow-hidden"
            )}
          >
            <div className="prose-cozy rounded-xl bg-brand-50/40 p-4 text-sm sm:p-5">
              <Markdown>{markdown}</Markdown>
            </div>
            {isLong && !expanded && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 rounded-b-xl bg-gradient-to-b from-transparent to-white" />
            )}
          </div>
          {isLong && (
            <div className="mt-2 flex justify-center">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Show less" : "Show the full plan"}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function PlanView({
  profile,
  contactsCount,
  applicationsCount,
  plan,
}: {
  profile: Profile | null;
  contactsCount: number;
  applicationsCount: number;
  plan: Plan | null;
}) {
  // Hydration-safe clock: null during SSR/first render, then the browser's.
  const now = useNow();

  return (
    <div>
      <PageHeader
        title="My Plan"
        description="Tell us where you are and we'll map out the rest — what's coming, when it hits, and what's actually worth doing this week. Timelines are only scary when they sneak up on you."
      />

      <div className="space-y-6">
        <PlanProfileForm
          key={profile?.updated_at ?? "new"}
          profile={profile}
          now={now}
        />
        {now ? (
          profile?.target_industries?.length ? (
            profile.target_industries
              .filter((value) =>
                INDUSTRIES.some((industry) => industry.value === value)
              )
              .map((industry, index) => (
                <WhereYouStand
                  key={industry}
                  profile={profile}
                  contactsCount={contactsCount}
                  applicationsCount={applicationsCount}
                  now={now}
                  industry={industry}
                  priority={index + 1}
                />
              ))
          ) : (
            <WhereYouStand
              profile={profile}
              contactsCount={contactsCount}
              applicationsCount={applicationsCount}
              now={now}
              industry={null}
            />
          )
        ) : (
          <Card className="flex items-center justify-center p-8">
            <Spinner />
          </Card>
        )}
        <TierGate
          feature="ai_plan"
          title="AI-personalized roadmap"
          blurb="A month-by-month plan built from your actual tracker, school, and timeline."
          variant="card"
        >
          <AiPlanSection
            profile={profile}
            contactsCount={contactsCount}
            applicationsCount={applicationsCount}
            plan={plan}
          />
        </TierGate>
        <Roadmap101 />
      </div>
    </div>
  );
}
