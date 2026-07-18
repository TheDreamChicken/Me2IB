"use client";

import { useMemo, useState } from "react";
import {
  Briefcase,
  CalendarDays,
  Flame,
  MapPin,
  Mic,
  Plus,
  Trophy,
} from "lucide-react";
import type { Application, Contact } from "@/lib/types";
import {
  APPLICATION_STATUSES,
  INDUSTRIES,
  PRIORITIES,
  TIERS,
  labelFor,
} from "@/lib/constants";
import {
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  StatCard,
} from "@/components/ui";
import {
  CompanyLogo,
  DeadlineChip,
  PriorityBadge,
  StatusBadge,
} from "./application-bits";
import { ApplicationForm } from "./application-form";
import { ApplicationDetail } from "./application-detail";

const INTERVIEW_STATUSES = [
  "online_assessment",
  "phone_screen",
  "first_round",
  "superday",
];

type SortKey = "deadline" | "updated" | "company";

/* ------------------------------------------------------------------ */
/* Application row                                                     */
/* ------------------------------------------------------------------ */

function ApplicationRow({
  app,
  onClick,
}: {
  app: Application;
  onClick: () => void;
}) {
  return (
    <Card className="p-4" onClick={onClick}>
      <div className="flex items-start gap-3">
        <CompanyLogo company={app.company} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="truncate font-medium text-brand-900">{app.company}</p>
            {app.position && (
              <p className="truncate text-xs text-zinc-500">{app.position}</p>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={app.status} />
            <PriorityBadge priority={app.priority} />
            {app.sector && (
              <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 whitespace-nowrap">
                {app.sector}
              </span>
            )}
          </div>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-1 text-xs text-zinc-500 sm:flex">
          <DeadlineChip app={app} />
          {app.location && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <MapPin className="h-3.5 w-3.5" />
              {app.location}
            </span>
          )}
          {app.season && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <CalendarDays className="h-3.5 w-3.5" />
              {app.season}
            </span>
          )}
        </div>
      </div>
      {/* Mobile meta row */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 sm:hidden">
        <DeadlineChip app={app} />
        {app.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {app.location}
          </span>
        )}
        {app.season && (
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {app.season}
          </span>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Grouping helpers                                                    */
/* ------------------------------------------------------------------ */

type IndustryGroup = {
  key: string;
  label: string;
  apps: Application[];
  /** Sub-groups by tier (finance/consulting only); null = flat list. */
  tiers: { key: string; label: string; apps: Application[] }[] | null;
};

function buildGroups(apps: Application[]): IndustryGroup[] {
  const byIndustry = new Map<string, Application[]>();
  for (const app of apps) {
    const key = app.industry || "other";
    const list = byIndustry.get(key);
    if (list) list.push(app);
    else byIndustry.set(key, [app]);
  }

  const knownOrder = INDUSTRIES.map((i) => i.value as string);
  const orderedKeys = [
    ...knownOrder.filter((v) => byIndustry.has(v)),
    ...[...byIndustry.keys()].filter((k) => !knownOrder.includes(k)),
  ];

  return orderedKeys.map((key) => {
    const groupApps = byIndustry.get(key)!;
    const tierDefs = TIERS[key];
    let tiers: IndustryGroup["tiers"] = null;
    if (tierDefs) {
      tiers = [];
      for (const t of tierDefs) {
        const matching = groupApps.filter((a) => a.tier === t.value);
        if (matching.length) {
          tiers.push({ key: t.value, label: t.label, apps: matching });
        }
      }
      const untiered = groupApps.filter(
        (a) => !a.tier || !tierDefs.some((t) => t.value === a.tier)
      );
      if (untiered.length) {
        tiers.push({ key: "__untiered", label: "Untiered", apps: untiered });
      }
    }
    return { key, label: labelFor(INDUSTRIES, key), apps: groupApps, tiers };
  });
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function ApplicationsView({
  applications,
  contacts,
}: {
  applications: Application[];
  contacts: Contact[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("deadline");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Keep the detail modal in sync with fresh server data after actions.
  const selected = applications.find((a) => a.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    let list = applications;
    if (statusFilter) list = list.filter((a) => a.status === statusFilter);
    if (priorityFilter)
      list = list.filter((a) => a.priority === priorityFilter);
    if (industryFilter)
      list = list.filter((a) => a.industry === industryFilter);
    if (seasonFilter.trim()) {
      const s = seasonFilter.toLowerCase();
      list = list.filter((a) => a.season?.toLowerCase().includes(s));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((a) =>
        [a.company, a.position, a.notes]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q))
      );
    }
    const sorted = [...list];
    if (sort === "deadline") {
      sorted.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
    }
    if (sort === "updated") {
      sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    }
    if (sort === "company") {
      sorted.sort((a, b) => a.company.localeCompare(b.company));
    }
    return sorted;
  }, [
    applications,
    query,
    statusFilter,
    priorityFilter,
    industryFilter,
    seasonFilter,
    sort,
  ]);

  const groups = useMemo(() => buildGroups(filtered), [filtered]);

  const activeCount = applications.filter(
    (a) => a.status !== "rejected" && a.status !== "withdrawn"
  ).length;
  const interviewCount = applications.filter((a) =>
    INTERVIEW_STATUSES.includes(a.status)
  ).length;
  const offerCount = applications.filter((a) => a.status === "offer").length;

  return (
    <div>
      <PageHeader
        title="Applications"
        description="Every role you're chasing, all in one spot. Toss them in as you find them — we'll keep an eye on the deadlines so nothing sneaks up on you."
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add application
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total applications"
          value={applications.length}
          icon={<Briefcase className="h-5 w-5" />}
        />
        <StatCard
          label="Active"
          value={activeCount}
          sub="Not rejected or withdrawn"
          icon={<Flame className="h-5 w-5" />}
        />
        <StatCard
          label="In interviews"
          value={interviewCount}
          sub="OA through superday"
          icon={<Mic className="h-5 w-5" />}
        />
        <StatCard
          label="Offers"
          value={offerCount}
          sub={offerCount ? "Let's go! 🎉" : "They're coming."}
          icon={<Trophy className="h-5 w-5" />}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          placeholder="Search company, position, notes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-64"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-auto"
        >
          <option value="">All statuses</option>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="w-auto"
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
        <Select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="w-auto"
        >
          <option value="">All industries</option>
          {INDUSTRIES.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Season..."
          value={seasonFilter}
          onChange={(e) => setSeasonFilter(e.target.value)}
          className="w-full sm:w-36"
        />
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="w-auto sm:ml-auto"
        >
          <option value="deadline">Deadline first</option>
          <option value="updated">Recently updated</option>
          <option value="company">Company A–Z</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-10 w-10" />}
          title={
            applications.length === 0 ? "No applications yet" : "No matches"
          }
          hint={
            applications.length === 0
              ? "Add the first role you're going after — even one you're just eyeing. Momentum starts here."
              : "Try a different search or filter."
          }
          action={
            applications.length === 0 ? (
              <Button onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" /> Add your first application
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-lg font-semibold text-brand-900">
                  {group.label}
                </h2>
                <span className="text-xs text-zinc-400">
                  {group.apps.length}{" "}
                  {group.apps.length === 1 ? "application" : "applications"}
                </span>
              </div>
              {group.tiers ? (
                <div className="space-y-5">
                  {group.tiers.map((tier) => (
                    <div key={tier.key}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-400">
                        {tier.label}
                      </p>
                      <div className="space-y-3">
                        {tier.apps.map((app) => (
                          <ApplicationRow
                            key={app.id}
                            app={app}
                            onClick={() => setSelectedId(app.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {group.apps.map((app) => (
                    <ApplicationRow
                      key={app.id}
                      app={app}
                      onClick={() => setSelectedId(app.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Add */}
      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add application"
      >
        <ApplicationForm
          application={null}
          contacts={contacts}
          onDone={() => setAdding(false)}
        />
      </Modal>

      {/* Persistent detail/edit shell: switching modes must never remount the overlay. */}
      <Modal
        open={!!selected}
        onClose={() => {
          if (editing) setEditing(null);
          else setSelectedId(null);
        }}
        title={editing ? "Edit application" : ""}
        wide={!editing}
      >
        {editing ? (
          <ApplicationForm
            application={editing}
            contacts={contacts}
            onDone={() => setEditing(null)}
          />
        ) : selected ? (
          <ApplicationDetail
            app={selected}
            contacts={contacts}
            onClose={() => setSelectedId(null)}
            onEdit={() => setEditing(selected)}
          />
        ) : null}
      </Modal>
    </div>
  );
}
