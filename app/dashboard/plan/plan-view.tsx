"use client";

import { useState, useTransition } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Compass,
  GraduationCap,
  Map,
  Sparkles,
  Sun,
} from "lucide-react";
import type { Profile } from "@/lib/types";
import { INDUSTRIES, STANDINGS, labelFor } from "@/lib/constants";
import { savePlanProfile } from "@/lib/actions/plan-profile";
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

function PlanProfileForm({ profile }: { profile: Profile | null }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear + i);
  if (profile?.grad_year && !years.includes(profile.grad_year)) {
    years.unshift(profile.grad_year);
  }

  function submit(formData: FormData) {
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

      <form action={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="School">
            <Input
              name="school"
              placeholder="e.g. University of Michigan"
              defaultValue={profile?.school ?? ""}
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
          <Field
            label="Standing"
            hint='Not sure? Pick "Standard student" and we’ll work it out from your grad date.'
          >
            <Select name="standing" defaultValue={profile?.standing ?? "standard"}>
              {STANDINGS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Target industry *">
            <Select
              name="target_industry"
              defaultValue={profile?.target_industries?.[0] ?? ""}
              required
            >
              <option value="" disabled>
                Pick an industry…
              </option>
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </Select>
          </Field>
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
}: {
  profile: Profile | null;
  contactsCount: number;
  applicationsCount: number;
}) {
  const industry = profile?.target_industries?.[0] ?? null;
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
        <h2 className="font-semibold text-brand-900">Where you stand</h2>
        <Badge className="ml-auto bg-brand-600 text-white">
          {PHASE_STEPS[t.phaseIndex].label}
        </Badge>
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
    tagline: "Go time for finance",
    bullets: [
      "IB applications for junior summer open January–June — yes, a year and a half early. Apply as soon as they open; review is rolling.",
      "Turn your best relationships into referrals — a referral means an employee formally recommends you, which can move your resume to the top of the pile.",
      "Get technicals interview-ready: HireVues (recorded video interviews) and first rounds arrive fast after you apply.",
      "Keep networking at your target firms — chats with analysts there are what referrals grow out of.",
    ],
  },
  {
    badge: "Year 3",
    title: "Junior fall & summer",
    tagline: "Consulting season and everything else",
    bullets: [
      "Consulting apps (MBB and friends) run summer through fall for the following summer — practice live cases with a partner, not just books.",
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
/* AI placeholder                                                      */
/* ------------------------------------------------------------------ */

function AiPlanPlaceholder() {
  return (
    <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/70 p-6 card-shadow">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <div className="rounded-2xl bg-brand-100 p-3 text-brand-600">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-brand-900">
            Personalized AI roadmap — coming soon
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            A month-by-month plan built from YOUR tracker, school, and
            timeline.
          </p>
        </div>
        <Button disabled>
          <Sparkles className="h-4 w-4" /> Generate my plan
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function PlanView({
  profile,
  contactsCount,
  applicationsCount,
}: {
  profile: Profile | null;
  contactsCount: number;
  applicationsCount: number;
}) {
  return (
    <div>
      <PageHeader
        title="My Plan"
        description="Tell us where you are; we'll show you where you're going. Recruiting timelines are brutal — but only if they surprise you."
      />

      <div className="space-y-6">
        <PlanProfileForm profile={profile} />
        <WhereYouStand
          profile={profile}
          contactsCount={contactsCount}
          applicationsCount={applicationsCount}
        />
        <AiPlanPlaceholder />
        <Roadmap101 />
      </div>
    </div>
  );
}
