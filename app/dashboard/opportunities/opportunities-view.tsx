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
  Info,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Telescope,
} from "lucide-react";
import type { Opportunity } from "@/lib/types";
import { INDUSTRIES, companyLogoUrl, labelFor } from "@/lib/constants";
import { callAI } from "@/lib/ai-client";
import {
  addScannedOpportunities,
  addToTracker,
  deleteOpportunity,
  setOpportunityStatus,
  upsertOpportunity,
  type ActionResult,
} from "@/lib/actions/opportunities";
import { TierGate } from "@/components/tier-gate";
import { PreferenceDeleteButton as DeleteButton } from "@/app/dashboard/settings/delete-button";
import { daysUntilLocal, useNow } from "@/components/use-today";
import {
  Badge,
  Button,
  Card,
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
    name: "Handshake",
    href: "https://joinhandshake.com/",
    blurb:
      "Sort for 'Apply Externally' roles — way better odds than the 1-click Easy Apply pile.",
  },
  {
    name: "LinkedIn Jobs",
    href: "https://www.linkedin.com/jobs/",
    blurb: "Set alerts; apply within 48h of posting or don't bother.",
  },
  {
    name: "BuiltIn",
    href: "https://builtin.com/",
    blurb:
      "City-by-city startup/tech boards — great for ops, marketing, product.",
  },
  {
    name: "Greenhouse boards",
    href: "https://www.greenhouse.io/",
    blurb:
      "Tons of companies' REAL application portals run on Greenhouse — applying at the source beats aggregators.",
  },
  {
    name: "Wellfound",
    href: "https://wellfound.com/",
    blurb: "Startup roles, often straight to a founder's inbox.",
  },
  {
    name: "Wall Street Oasis job board",
    href: "https://www.wallstreetoasis.com/job-board",
    blurb: "Finance-specific, boutique-heavy.",
  },
  {
    name: "RippleMatch",
    href: "https://ripplematch.com/",
    blurb: "Set it up once, let it match you.",
  },
  {
    name: "Forage",
    href: "https://www.theforage.com/",
    blurb: "Free virtual 'internships' — resume line + genuine skill preview.",
  },
] as const;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

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
  // Hydration-safe: neutral date-only badge until mounted, then urgency
  // from the viewer's clock.
  const now = useNow();
  if (!now) {
    return (
      <Badge className="bg-zinc-100 text-zinc-600">
        <CalendarClock className="h-3 w-3" />
        {formatDate(deadline)}
      </Badge>
    );
  }
  const days = daysUntilLocal(deadline, now);
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
/* AI scanner + curated links                                          */
/* ------------------------------------------------------------------ */

/** One row from the "opportunities" AI scan (see app/api/ai/route.ts). */
type ScannedItem = {
  title: string;
  company?: string | null;
  industry?: string | null;
  location?: string | null;
  link?: string | null;
  source?: string | null;
  deadline?: string | null;
  notes?: string | null;
};

const DEADLINE_RE = /^\d{4}-\d{2}-\d{2}$/;

function OpportunityScanner({
  defaultIndustries,
}: {
  defaultIndustries: string[];
}) {
  const [industries, setIndustries] = useState<string[]>(() =>
    defaultIndustries.filter((v) => INDUSTRIES.some((i) => i.value === v))
  );
  const [country, setCountry] = useState("United States");
  const [stateRegion, setStateRegion] = useState("");
  const [city, setCity] = useState("");
  const [season, setSeason] = useState("");
  const [year, setYear] = useState("");
  const [keywords, setKeywords] = useState("");

  const [scanning, startScan] = useTransition();
  const [results, setResults] = useState<ScannedItem[] | null>(null);
  const [setup, setSetup] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [addPending, startAdd] = useTransition();
  const [addingKey, setAddingKey] = useState<number | "all" | null>(null);
  const [addedRows, setAddedRows] = useState<Set<number>>(new Set());
  const [addError, setAddError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function toggleIndustry(value: string) {
    setIndustries((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function scan() {
    setScanError(null);
    setSetup(null);
    setNotice(null);
    setAddError(null);
    startScan(async () => {
      const location = [
        city.trim() && `City: ${city.trim()}`,
        stateRegion.trim() && `State/region: ${stateRegion.trim()}`,
        country.trim() && `Country: ${country.trim()}`,
      ]
        .filter(Boolean)
        .join("; ");
      const timeline = [season, year.trim()].filter(Boolean).join(" ");
      const searchKeywords = [
        keywords.trim(),
        timeline && `Target recruiting timeline: ${timeline}`,
      ]
        .filter(Boolean)
        .join(". ");
      const res = await callAI<ScannedItem[]>("opportunities", {
        industries: industries.map((v) => labelFor(INDUSTRIES, v)),
        location: location || "No geographic preference",
        keywords: searchKeywords,
      });
      if (res.setup) {
        setSetup(res.setup);
      } else if (res.upgrade) {
        // This panel sits behind a TierGate, but render server pushback anyway.
        setScanError(
          res.error ??
            `The scanner needs the ${res.upgrade.neededLabel} plan — upgrade in Account → Plan.`
        );
      } else if (res.error) {
        setScanError(res.error);
      } else if (Array.isArray(res.data)) {
        setResults(
          res.data
            .filter(
              (x) => x && typeof x.title === "string" && x.title.trim() !== ""
            )
            .slice(0, 15)
        );
        setAddedRows(new Set());
      } else {
        setScanError("The scan returned an unexpected result. Try again.");
      }
    });
  }

  function addItems(key: number | "all", entries: [number, ScannedItem][]) {
    setAddingKey(key);
    setAddError(null);
    setNotice(null);
    startAdd(async () => {
      const res = await addScannedOpportunities(entries.map(([, item]) => item));
      if (res.error) {
        setAddError(res.error);
      } else {
        setAddedRows((prev) => {
          const next = new Set(prev);
          for (const [idx] of entries) next.add(idx);
          return next;
        });
        const addedCount = res.added ?? 0;
        const skippedCount = res.skipped ?? 0;
        setNotice(
          addedCount === 0
            ? "Already on your board — nothing new to add."
            : skippedCount > 0
              ? `Added ${addedCount} to your board — ${skippedCount} already on it.`
              : `Added ${addedCount} to your board.`
        );
      }
      setAddingKey(null);
    });
  }

  const remaining = (results ?? [])
    .map((item, idx) => [idx, item] as [number, ScannedItem])
    .filter(([idx]) => !addedRows.has(idx));

  return (
    <div className="rounded-2xl border border-dashed border-brand-200 bg-gradient-to-br from-brand-100 via-brand-50 to-white p-5 card-shadow">
      <div className="flex flex-wrap items-center gap-4">
        <div className="rounded-2xl bg-brand-100 p-3 text-brand-600">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-brand-900">AI opportunity scanner</p>
          <p className="mt-0.5 text-sm text-zinc-500">
            Pick your targets and scan the live web for internships and
            programs that are open right now.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {INDUSTRIES.map((i) => {
          const on = industries.includes(i.value);
          return (
            <button
              key={i.value}
              type="button"
              onClick={() => toggleIndustry(i.value)}
              aria-pressed={on}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                on
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-brand-200 bg-white text-zinc-600 hover:border-brand-300 hover:text-brand-700"
              )}
            >
              {i.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Field label="Country">
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="United States"
          />
        </Field>
        <Field label="State / region">
          <Input
            value={stateRegion}
            onChange={(e) => setStateRegion(e.target.value)}
            placeholder="California"
          />
        </Field>
        <Field label="City">
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="San Francisco"
          />
        </Field>
      </div>

      <div className="mt-3 grid items-end gap-2 sm:grid-cols-[10rem_8rem_minmax(0,1fr)_auto]">
        <Field label="Season">
          <Select value={season} onChange={(e) => setSeason(e.target.value)}>
            <option value="">Any season</option>
            <option value="Fall">Fall</option>
            <option value="Winter">Winter</option>
            <option value="Spring">Spring</option>
            <option value="Summer">Summer</option>
          </Select>
        </Field>
        <Field label="Year">
          <Input
            type="number"
            min={2020}
            max={2100}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2027"
          />
        </Field>
        <Field label="Keywords">
          <Input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="sophomore, M&A, rotational..."
          />
        </Field>
        <Button
          onClick={scan}
          disabled={scanning}
          variant={results === null ? "primary" : "secondary"}
          className="w-full sm:w-auto"
        >
          {scanning ? (
            <Spinner />
          ) : results === null ? (
            <Sparkles className="h-4 w-4" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {results === null ? "Scan for latest" : "Refresh list"}
        </Button>
      </div>

      {scanning && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-brand-100 bg-white px-4 py-3 text-sm text-zinc-500">
          <Spinner className="shrink-0 text-brand-500" />
          Scanning the live web for fresh postings — this usually takes 30–90
          seconds. Worth the wait.
        </div>
      )}

      {setup && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-brand-200 bg-white p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand-900">
              One quick setup step first
            </p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">{setup}</p>
          </div>
        </div>
      )}

      {scanError && <p className="mt-3 text-sm text-rose-600">{scanError}</p>}

      {results !== null &&
        !scanning &&
        (results.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            The scan came back empty — try different industries or keywords.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-brand-100 bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-brand-100 px-4 py-2.5">
              <p className="text-xs font-medium text-zinc-500">
                Found {results.length} — fresh from the web, so double-check
                details before applying.
              </p>
              <div className="ml-auto">
                {remaining.length > 0 ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={addPending}
                    onClick={() => addItems("all", remaining)}
                  >
                    {addPending && addingKey === "all" ? (
                      <Spinner />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}{" "}
                    Add all
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> All on your board
                  </span>
                )}
              </div>
            </div>
            {(notice || addError) && (
              <div className="border-b border-brand-100 px-4 py-2">
                {notice && (
                  <p className="text-xs font-medium text-emerald-600">
                    {notice}
                  </p>
                )}
                {addError && <p className="text-xs text-rose-600">{addError}</p>}
              </div>
            )}
            <ul className="divide-y divide-brand-50">
              {results.map((item, idx) => (
                <li
                  key={`${idx}-${item.title}`}
                  className="flex flex-wrap items-start gap-3 px-4 py-3 sm:flex-nowrap"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-1.5">
                      <p className="text-sm font-medium leading-snug text-brand-900">
                        {item.title}
                      </p>
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open posting"
                          className="mt-0.5 shrink-0 rounded p-0.5 text-brand-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {[item.company, item.location]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                      {item.source ? ` · via ${item.source}` : ""}
                    </p>
                    {(item.industry || item.deadline) && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {item.industry &&
                          INDUSTRIES.some((i) => i.value === item.industry) && (
                            <Badge>{labelFor(INDUSTRIES, item.industry)}</Badge>
                          )}
                        {item.deadline && DEADLINE_RE.test(item.deadline) && (
                          <Badge className="bg-zinc-100 text-zinc-600">
                            <CalendarClock className="h-3 w-3" /> Due{" "}
                            {formatDate(item.deadline)}
                          </Badge>
                        )}
                      </div>
                    )}
                    {item.notes && (
                      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 pt-0.5">
                    {addedRows.has(idx) ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Added
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={addPending}
                        onClick={() => addItems(idx, [[idx, item]])}
                      >
                        {addPending && addingKey === idx ? (
                          <Spinner />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}{" "}
                        Add to board
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
      className="space-y-4"
    >
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
                setError(null);
                startTransition(async () => {
                  const res = await deleteOpportunity(opportunity.id);
                  if (res.error) setError(res.error);
                  else onDone();
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
  const [error, setError] = useState<string | null>(null);
  const logo = companyLogoUrl(o.company);

  function run(action: string, fn: () => Promise<ActionResult>) {
    setActing(action);
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
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

      {error && (
        <p className="mt-2.5 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function OpportunitiesView({
  opportunities,
  targetIndustries,
}: {
  opportunities: Opportunity[];
  targetIndustries: string[];
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
        description="Spot something promising? Park it here before the tab gets lost, then push the keepers into your tracker."
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add opportunity
          </Button>
        }
      />

      <div className="mb-4">
        <TierGate
          feature="ai_import"
          title="AI opportunity scanner"
          blurb="Fresh internships and programs scanned from the live web, matched to your industries."
          variant="card"
        >
          <OpportunityScanner defaultIndustries={targetIndustries} />
        </TierGate>
      </div>
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
