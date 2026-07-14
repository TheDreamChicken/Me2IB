"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Bookmark,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Telescope,
} from "lucide-react";
import type { Opportunity } from "@/lib/types";
import { INDUSTRIES, companyLogoUrl, labelFor } from "@/lib/constants";
import {
  addToTracker,
  deleteOpportunity,
  setOpportunityStatus,
  upsertOpportunity,
} from "@/lib/actions/opportunities";
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
  Textarea,
  cn,
} from "@/components/ui";

/* ------------------------------------------------------------------ */
/* Vocabulary (opportunity-specific, not in shared constants)          */
/* ------------------------------------------------------------------ */

const OPPORTUNITY_STATUSES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-700" },
  { value: "saved", label: "Saved", color: "bg-amber-100 text-amber-700" },
  {
    value: "added_to_tracker",
    label: "In tracker",
    color: "bg-emerald-100 text-emerald-700",
  },
  { value: "dismissed", label: "Dismissed", color: "bg-zinc-100 text-zinc-500" },
] as const;

const HUNTING_SPOTS = [
  {
    name: "LinkedIn Jobs",
    href: "https://www.linkedin.com/jobs/",
    blurb: "Set alerts for your target roles — postings fill up fast.",
  },
  {
    name: "Handshake",
    href: "https://joinhandshake.com/",
    blurb: "School-exclusive postings and on-campus recruiting events.",
  },
  {
    name: "WSO Job Board",
    href: "https://www.wallstreetoasis.com/job-board",
    blurb: "Finance-focused board — heavy on IB, PE, and buy-side roles.",
  },
  {
    name: "Indeed",
    href: "https://www.indeed.com/",
    blurb: "Broad coverage; good for middle-market and regional firms.",
  },
  {
    name: "RippleMatch",
    href: "https://ripplematch.com/",
    blurb: "Early-career matching — many firms source candidates here.",
  },
  {
    name: "Forage",
    href: "https://www.theforage.com/",
    blurb: "Free virtual experience programs — great resume signal.",
  },
] as const;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function statusBadge(status: string) {
  const s = OPPORTUNITY_STATUSES.find((x) => x.value === status);
  return (
    <Badge className={s?.color ?? "bg-zinc-100 text-zinc-600"}>
      {s?.label ?? status}
    </Badge>
  );
}

function DeadlineBadge({ deadline }: { deadline: string }) {
  const days = daysUntil(deadline);
  const urgent = days < 7;
  return (
    <Badge
      className={
        urgent ? "bg-rose-50 text-rose-600" : "bg-zinc-100 text-zinc-600"
      }
    >
      <CalendarClock className="h-3 w-3" />
      {days < 0
        ? `Closed ${formatDate(deadline)}`
        : days === 0
          ? "Due today!"
          : `Due ${formatDate(deadline)}`}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* AI placeholder + curated links                                      */
/* ------------------------------------------------------------------ */

function ScannerPlaceholder() {
  return (
    <Card className="mb-4 border-dashed bg-gradient-to-br from-brand-50 via-brand-50/60 to-white p-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="rounded-2xl bg-brand-100 p-3 text-brand-600">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-brand-900">
            AI opportunity scanner — coming soon
          </p>
          <p className="mt-0.5 text-sm text-zinc-500">
            One click pulls fresh internship postings for your target
            industries, straight into this board.
          </p>
        </div>
        <Button disabled>
          <Sparkles className="h-4 w-4" /> Scan for latest
        </Button>
      </div>
    </Card>
  );
}

function HuntingSpots() {
  return (
    <Card className="mb-6 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Compass className="h-4 w-4 text-brand-500" />
        <h2 className="text-sm font-semibold text-brand-900">
          Where to hunt right now
        </h2>
      </div>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {HUNTING_SPOTS.map((spot) => (
          <a
            key={spot.name}
            href={spot.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl p-2 -m-2 transition-colors hover:bg-brand-50"
          >
            <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-800 group-hover:text-brand-600">
              {spot.name}
              <ArrowUpRight className="h-3.5 w-3.5 text-brand-300 transition-colors group-hover:text-brand-500" />
            </span>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
              {spot.blurb}
            </p>
          </a>
        ))}
      </div>
      <p className="mt-4 border-t border-brand-100 pt-3 text-xs text-zinc-400">
        And don&apos;t skip company careers pages — most firms post there
        first, weeks before the postings hit job boards.
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Add / edit form                                                     */
/* ------------------------------------------------------------------ */

function OpportunityForm({
  opportunity,
  onDone,
}: {
  opportunity: Opportunity | null;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const res = await upsertOpportunity(formData);
      if (res.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <form action={submit} className="space-y-4">
      {opportunity && <input type="hidden" name="id" value={opportunity.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title *">
          <Input
            name="title"
            placeholder="Investment Banking Summer Analyst"
            defaultValue={opportunity?.title}
            required
            autoFocus
          />
        </Field>
        <Field label="Company">
          <Input name="company" defaultValue={opportunity?.company ?? ""} />
        </Field>
        <Field label="Industry">
          <Select name="industry" defaultValue={opportunity?.industry ?? ""}>
            <option value="">—</option>
            {INDUSTRIES.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Location">
          <Input name="location" defaultValue={opportunity?.location ?? ""} />
        </Field>
        <Field label="Link">
          <Input
            name="link"
            placeholder="https://careers..."
            defaultValue={opportunity?.link ?? ""}
          />
        </Field>
        <Field label="Source" hint="Where you found it — LinkedIn, WSO, a friend...">
          <Input name="source" defaultValue={opportunity?.source ?? ""} />
        </Field>
        <Field label="Deadline">
          <Input
            name="deadline"
            type="date"
            defaultValue={opportunity?.deadline ?? ""}
          />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={opportunity?.status ?? "new"}>
            {OPPORTUNITY_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Notes">
        <Textarea
          name="notes"
          placeholder="Sophomore-friendly, referral possible via..."
          defaultValue={opportunity?.notes ?? ""}
        />
      </Field>

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div>
          {opportunity && (
            <DeleteButton
              onConfirm={() => {
                startTransition(async () => {
                  await deleteOpportunity(opportunity.id);
                  onDone();
                });
              }}
            />
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : opportunity ? "Save changes" : "Add opportunity"}
          </Button>
        </div>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Opportunity card                                                    */
/* ------------------------------------------------------------------ */

function OpportunityCard({
  opportunity: o,
  onEdit,
}: {
  opportunity: Opportunity;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [acting, setActing] = useState<string | null>(null);
  const logo = companyLogoUrl(o.company);

  function run(action: string, fn: () => Promise<unknown>) {
    setActing(action);
    startTransition(async () => {
      await fn();
      setActing(null);
    });
  }

  const spinnerOr = (action: string, node: React.ReactNode) =>
    pending && acting === action ? <Spinner /> : node;

  return (
    <Card className={cn("flex flex-col p-4", o.status === "dismissed" && "opacity-60")}>
      <div className="flex items-start gap-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="mt-0.5 h-9 w-9 shrink-0 rounded-xl border border-brand-100 bg-white p-1.5" />
        ) : (
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-500">
            <Building2 className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug text-brand-900">{o.title}</p>
          <p className="truncate text-xs text-zinc-500">{o.company ?? "—"}</p>
        </div>
        {o.link && (
          <a
            href={o.link}
            target="_blank"
            rel="noopener noreferrer"
            title="Open posting"
            className="rounded-lg p-1.5 text-brand-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
          >
            <ArrowUpRight className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {statusBadge(o.status)}
        {o.industry && <Badge>{labelFor(INDUSTRIES, o.industry)}</Badge>}
        {o.deadline && <DeadlineBadge deadline={o.deadline} />}
        {o.location && (
          <Badge className="bg-zinc-100 text-zinc-600">
            <MapPin className="h-3 w-3" />
            {o.location}
          </Badge>
        )}
      </div>

      {(o.notes || o.source) && (
        <div className="mt-2.5 space-y-1">
          {o.notes && (
            <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">
              {o.notes}
            </p>
          )}
          {o.source && (
            <p className="text-xs text-zinc-400">via {o.source}</p>
          )}
        </div>
      )}

      {/* Spacer keeps action rows aligned across cards of differing height */}
      <div className="mt-3 flex-1" />
      <div className="flex flex-wrap items-center gap-1.5 border-t border-brand-100 pt-3">
          {o.status === "added_to_tracker" ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> In your tracker ✓
            </span>
          ) : o.status === "dismissed" ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => run("restore", () => setOpportunityStatus(o.id, "new"))}
            >
              {spinnerOr("restore", "Restore")}
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                disabled={pending}
                onClick={() => run("track", () => addToTracker(o.id))}
              >
                {spinnerOr(
                  "track",
                  <>
                    <ClipboardCheck className="h-3.5 w-3.5" /> Add to tracker
                  </>
                )}
              </Button>
              {o.status !== "saved" && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => run("save", () => setOpportunityStatus(o.id, "saved"))}
                >
                  {spinnerOr(
                    "save",
                    <>
                      <Bookmark className="h-3.5 w-3.5" /> Save
                    </>
                  )}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => run("dismiss", () => setOpportunityStatus(o.id, "dismissed"))}
              >
                {spinnerOr("dismiss", "Dismiss")}
              </Button>
            </>
          )}
          <button
            onClick={onEdit}
            title="Edit"
            aria-label="Edit opportunity"
            className="ml-auto cursor-pointer rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-brand-50 hover:text-brand-700"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function OpportunitiesView({
  opportunities,
}: {
  opportunities: Opportunity[];
}) {
  const [statusFilter, setStatusFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Resolve against fresh server data so the modal stays in sync.
  const editing = opportunities.find((o) => o.id === editingId) ?? null;

  const filtered = useMemo(() => {
    let list = opportunities;
    if (statusFilter) list = list.filter((o) => o.status === statusFilter);
    if (industryFilter) list = list.filter((o) => o.industry === industryFilter);
    return list;
  }, [opportunities, statusFilter, industryFilter]);

  return (
    <div>
      <PageHeader
        title="Opportunities"
        description="A holding pen for postings you spot — save the promising ones, then push them into your tracker."
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add opportunity
          </Button>
        }
      />

      <ScannerPlaceholder />
      <HuntingSpots />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-auto"
        >
          <option value="">All statuses</option>
          {OPPORTUNITY_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
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
        <p className="ml-auto text-xs text-zinc-400">
          {filtered.length} {filtered.length === 1 ? "opportunity" : "opportunities"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Telescope className="h-10 w-10" />}
          title={
            opportunities.length === 0 ? "No opportunities yet" : "No matches"
          }
          hint={
            opportunities.length === 0
              ? "Spot an interesting posting on one of the boards above? Log it here so it doesn't slip away."
              : "Try a different status or industry filter."
          }
          action={
            opportunities.length === 0 ? (
              <Button onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" /> Log your first opportunity
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => (
            <OpportunityCard
              key={o.id}
              opportunity={o}
              onEdit={() => setEditingId(o.id)}
            />
          ))}
        </div>
      )}

      {/* Add */}
      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add opportunity"
        wide
      >
        <OpportunityForm opportunity={null} onDone={() => setAdding(false)} />
      </Modal>

      {/* Edit */}
      <Modal
        open={!!editing}
        onClose={() => setEditingId(null)}
        title="Edit opportunity"
        wide
      >
        {editing && (
          <OpportunityForm
            opportunity={editing}
            onDone={() => setEditingId(null)}
          />
        )}
      </Modal>
    </div>
  );
}
