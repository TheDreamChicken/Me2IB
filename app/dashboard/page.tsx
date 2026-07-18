import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlarmClock,
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Map,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type {
  Application,
  CalendarEvent,
  Contact,
  Profile,
} from "@/lib/types";
import { APPLICATION_STATUSES, EVENT_TYPES, labelFor } from "@/lib/constants";
import { daysSinceTouch, followupDelta, isOverdue } from "@/lib/contact-utils";
import { Badge, Button, Card, StatCard } from "@/components/ui";
import { LocalDate, LocalTime } from "@/components/local-date";
import { DueBadge, TodayHeading } from "./overview-bits";

export const metadata: Metadata = { title: "Overview" };

/* ------------------------------------------------------------------ */
/* Date helpers — server clock, used only for coarse query bounds and  */
/* filtering. User-visible labels render viewer-local via client bits. */
/* ------------------------------------------------------------------ */

const MS_DAY = 86_400_000;

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Days from today to a YYYY-MM-DD date (0 = today, 1 = tomorrow). */
function daysFromToday(date: string): number {
  const then = new Date(date + "T00:00:00").getTime();
  return Math.round((then - startOfToday()) / MS_DAY);
}

const INTERVIEW_STATUSES = new Set([
  "online_assessment",
  "phone_screen",
  "first_round",
  "superday",
]);

const CLOSED_STATUSES = new Set(["rejected", "withdrawn", "offer"]);

type UpcomingItem = {
  app: Application;
  date: string;
  kind: "Deadline" | "Next step";
  days: number;
};

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-brand-400">
      {children}
    </p>
  );
}

function CardHeader({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 pb-1 pt-4">
      <p className="text-sm font-semibold text-brand-900">{title}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 transition-colors hover:text-brand-800"
      >
        {linkLabel} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-brand-800 shadow-sm transition-colors hover:bg-brand-50"
    >
      <Icon className="h-4 w-4 text-brand-500" /> {label}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Layout already gates this route; defense in depth for TS + safety.
  if (!user) redirect("/login?next=/dashboard");

  // A request-time snapshot is intentional in this dynamic server page: all
  // staleness/deadline calculations below use the same instant.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const [contactsRes, appsRes, eventsRes, weekCountRes, profileRes] =
    await Promise.all([
      supabase.from("contacts").select("*"),
      supabase.from("applications").select("*"),
      supabase
        .from("events")
        .select("*")
        .gte("start_at", new Date(startOfToday()).toISOString())
        .order("start_at", { ascending: true })
        .limit(10),
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .gte("start_at", new Date(nowMs - MS_DAY).toISOString())
        .lte("start_at", new Date(nowMs + 7 * MS_DAY).toISOString()),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

  if (contactsRes.error)
    throw new Error(`Couldn't load contacts: ${contactsRes.error.message}`);
  if (appsRes.error)
    throw new Error(`Couldn't load applications: ${appsRes.error.message}`);
  if (eventsRes.error)
    throw new Error(`Couldn't load events: ${eventsRes.error.message}`);
  if (weekCountRes.error)
    throw new Error(
      `Couldn't count upcoming events: ${weekCountRes.error.message}`
    );
  if (profileRes.error)
    throw new Error(`Couldn't load your profile: ${profileRes.error.message}`);

  const contacts = (contactsRes.data ?? []) as Contact[];
  const applications = (appsRes.data ?? []) as Application[];
  const events = (eventsRes.data ?? []) as CalendarEvent[];
  const profile = (profileRes.data ?? null) as Profile | null;

  /* ----- greeting ----- */
  const fullName =
    profile?.full_name ||
    (user.user_metadata?.full_name as string | undefined) ||
    "";
  const firstName =
    fullName.trim().split(/\s+/)[0] || user.email?.split("@")[0] || "there";

  /* ----- stats ----- */
  const activeContacts = contacts.filter((c) => c.status !== "archived");
  const activeApplications = applications.filter(
    (a) => a.status !== "rejected" && a.status !== "withdrawn"
  );
  const interviewCount = applications.filter((a) =>
    INTERVIEW_STATUSES.has(a.status)
  ).length;
  const upcomingWeekCount = weekCountRes.count ?? 0;

  /* ----- needs attention ----- */
  const overdue = contacts
    .filter(isOverdue)
    .sort((a, b) => followupDelta(b) - followupDelta(a))
    .slice(0, 5);

  const upcoming: UpcomingItem[] = applications
    .filter((a) => !CLOSED_STATUSES.has(a.status))
    .flatMap((app) => {
      const candidates: { date: string; kind: "Deadline" | "Next step" }[] = [];
      if (app.deadline) candidates.push({ date: app.deadline, kind: "Deadline" });
      if (app.next_step_date)
        candidates.push({ date: app.next_step_date, kind: "Next step" });
      const within = candidates
        .map((c) => ({ ...c, days: daysFromToday(c.date) }))
        .filter((c) => c.days >= 0 && c.days <= 14)
        .sort((x, y) => x.days - y.days);
      return within.length ? [{ app, ...within[0] }] : [];
    })
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  const everythingEmpty =
    contacts.length === 0 && applications.length === 0 && events.length === 0;

  return (
    <div>
      <TodayHeading firstName={firstName} />

      {/* Stats row */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/contacts" className="block transition-transform hover:-translate-y-0.5">
          <StatCard
            label="Contacts"
            value={activeContacts.length}
            sub="people in your corner"
            icon={<Users className="h-5 w-5" />}
          />
        </Link>
        <Link href="/dashboard/applications" className="block transition-transform hover:-translate-y-0.5">
          <StatCard
            label="Active applications"
            value={activeApplications.length}
            sub={`${applications.length} tracked overall`}
            icon={<Briefcase className="h-5 w-5" />}
          />
        </Link>
        <Link href="/dashboard/applications" className="block transition-transform hover:-translate-y-0.5">
          <StatCard
            label="Interviews in progress"
            value={interviewCount}
            sub="OA through superday"
            icon={<ClipboardList className="h-5 w-5" />}
          />
        </Link>
        <Link href="/dashboard/calendar" className="block transition-transform hover:-translate-y-0.5">
          <StatCard
            label="Upcoming events"
            value={upcomingWeekCount}
            sub="next 7 days"
            icon={<CalendarDays className="h-5 w-5" />}
          />
        </Link>
      </div>

      {everythingEmpty ? (
        /* ----- Getting started checklist ----- */
        <div className="mb-8">
          <SectionLabel>Getting started</SectionLabel>
          <Card className="p-6">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-xl bg-brand-100 p-2 text-brand-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-brand-900">
                  Let&apos;s get you set up
                </p>
                <p className="text-sm text-zinc-500">
                  Three quick steps and your recruiting HQ is up and running.
                </p>
              </div>
            </div>
            <ol className="space-y-2">
              {[
                {
                  href: "/dashboard/contacts",
                  title: "Add your first contact",
                  hint: "An alum, a club upperclassman — anyone in your corner counts.",
                },
                {
                  href: "/dashboard/applications",
                  title: "Track your first application",
                  hint: "Log a posting you're eyeing so nothing slips through the cracks.",
                },
                {
                  href: "/dashboard/plan",
                  title: "Set up your plan",
                  hint: "Get a semester-by-semester roadmap tailored to your timeline.",
                },
              ].map((step, i) => (
                <li key={step.href}>
                  <Link
                    href={step.href}
                    className="flex items-center gap-3 rounded-xl border border-brand-100 bg-white px-4 py-3 transition-colors hover:border-brand-300 hover:bg-brand-50"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-brand-900">
                        {step.title}
                      </p>
                      <p className="text-xs text-zinc-400">{step.hint}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-brand-400" />
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      ) : (
        <>
          {/* ----- Needs attention ----- */}
          <div className="mb-8">
            <SectionLabel>Needs attention</SectionLabel>
            <div className="grid gap-3 lg:grid-cols-2">
              {/* Overdue follow-ups */}
              <Card>
                <CardHeader
                  title="Overdue follow-ups"
                  href="/dashboard/contacts"
                  linkLabel="View contacts"
                />
                {overdue.length === 0 ? (
                  <p className="flex items-center gap-2 px-4 pb-4 pt-2 text-sm text-zinc-400">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    All caught up — no overdue follow-ups.
                  </p>
                ) : (
                  <ul className="p-2">
                    {overdue.map((c) => (
                      <li key={c.id}>
                        <Link
                          href="/dashboard/contacts"
                          className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-brand-50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-brand-900">
                              {c.name}
                            </p>
                            <p className="truncate text-xs text-zinc-500">
                              {c.company || "No company saved"}
                            </p>
                          </div>
                          <Badge className="bg-rose-50 text-rose-600">
                            <AlarmClock className="h-3 w-3" />
                            {c.last_contacted
                              ? `${daysSinceTouch(c)}d since last touch`
                              : "Never contacted"}
                          </Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* Upcoming deadlines & next steps */}
              <Card>
                <CardHeader
                  title="Upcoming deadlines & next steps"
                  href="/dashboard/applications"
                  linkLabel="View applications"
                />
                {upcoming.length === 0 ? (
                  <p className="flex items-center gap-2 px-4 pb-4 pt-2 text-sm text-zinc-400">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Nothing due in the next two weeks.
                  </p>
                ) : (
                  <ul className="p-2">
                    {upcoming.map((item) => (
                      <li key={`${item.app.id}-${item.kind}`}>
                        <Link
                          href="/dashboard/applications"
                          className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-brand-50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-brand-900">
                              {item.app.company}
                              {item.app.position ? ` — ${item.app.position}` : ""}
                            </p>
                            <p className="truncate text-xs text-zinc-500">
                              {item.kind === "Next step" && item.app.next_step
                                ? `Next step: ${item.app.next_step}`
                                : item.kind}
                              {" · "}
                              {labelFor(APPLICATION_STATUSES, item.app.status)}
                            </p>
                          </div>
                          <DueBadge dateStr={item.date} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>

          {/* ----- Upcoming events ----- */}
          <div className="mb-8">
            <SectionLabel>Upcoming events</SectionLabel>
            <Card>
              <CardHeader
                title="Next on your calendar"
                href="/dashboard/calendar"
                linkLabel="Open calendar"
              />
              {events.length === 0 ? (
                <p className="px-4 pb-4 pt-2 text-sm text-zinc-400">
                  No upcoming events — schedule a coffee chat or info session
                  to keep the ball rolling.
                </p>
              ) : (
                <ul className="p-2">
                  {events.map((e) => {
                    const type = EVENT_TYPES.find(
                      (t) => t.value === e.event_type
                    );
                    return (
                      <li key={e.id}>
                        <Link
                          href="/dashboard/calendar"
                          className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-brand-50"
                        >
                          <div className="w-24 shrink-0 sm:w-28">
                            <p className="text-sm font-medium text-brand-900">
                              <LocalDate
                                iso={e.start_at}
                                options={{
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                }}
                              />
                            </p>
                            <p className="text-xs text-zinc-400">
                              {e.all_day ? (
                                "All day"
                              ) : (
                                <LocalTime iso={e.start_at} />
                              )}
                            </p>
                          </div>
                          <Badge className={type?.color}>
                            {type?.label ?? e.event_type}
                          </Badge>
                          <p className="min-w-0 flex-1 truncate text-sm text-brand-900">
                            {e.title}
                          </p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}

      {/* ----- Quick actions ----- */}
      <div className="mb-8">
        <SectionLabel>Quick actions</SectionLabel>
        <div className="flex flex-wrap gap-2">
          <QuickAction href="/dashboard/contacts" icon={Plus} label="Add a contact" />
          <QuickAction
            href="/dashboard/applications"
            icon={Briefcase}
            label="Log an application"
          />
          <QuickAction
            href="/dashboard/calendar"
            icon={CalendarDays}
            label="Open calendar"
          />
          <QuickAction href="/dashboard/plan" icon={Map} label="See my plan" />
        </div>
      </div>

      {/* ----- AI placeholder ----- */}
      <Card className="border-dashed">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-brand-50/70 p-5">
          <div className="rounded-xl bg-brand-100 p-2 text-brand-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-brand-900">
              Smart suggestions — coming soon
            </p>
            <p className="text-sm text-zinc-500">
              me2IB will scan your pipeline and suggest exactly who to reach
              out to and what to tackle next.
            </p>
          </div>
          <Button variant="secondary" size="sm" disabled>
            Coming soon
          </Button>
        </div>
      </Card>
    </div>
  );
}
