"use client";

// AI Practice: a locked preview of the future AI-generated question sets.
// Per repo convention, AI features are placeholder-only right now — the
// controls below work visually (local state) but nothing calls the API.

import { useState } from "react";
import { Check, Info, Lock, Sparkles } from "lucide-react";
import { Button, Card, cn } from "@/components/ui";

type Area = "consulting" | "finance" | "general";

const AREAS: { value: Area; label: string; types: string[] }[] = [
  {
    value: "consulting",
    label: "Consulting",
    types: [
      "Data-table exhibits",
      "Market sizing",
      "Profitability trees",
      "Chart reading (% change & CAGR)",
      "Breakevens & pricing",
    ],
  },
  {
    value: "finance",
    label: "Finance",
    types: [
      "3-statement flows (“depreciation +$10…”)",
      "DCF components (terminal value, discounting)",
      "Accretion/dilution checks",
      "Income-statement builds",
      "Multiples math",
    ],
  },
  {
    value: "general",
    label: "General business",
    types: ["Growth & percentages", "Unit economics", "Estimation brainteasers"],
  },
];

export function AiPracticeTab() {
  const [area, setArea] = useState<Area>("consulting");
  const [selected, setSelected] = useState<Record<Area, string[]>>({
    consulting: ["Data-table exhibits", "Market sizing"],
    finance: [
      "3-statement flows (“depreciation +$10…”)",
      "Income-statement builds",
    ],
    general: ["Growth & percentages"],
  });

  const current = AREAS.find((a) => a.value === area) ?? AREAS[0];
  const picked = selected[area];

  const toggle = (t: string) =>
    setSelected((prev) => ({
      ...prev,
      [area]: prev[area].includes(t)
        ? prev[area].filter((x) => x !== t)
        : [...prev[area], t],
    }));

  return (
    <div className="space-y-4">
      {/* Hero */}
      <Card className="border-dashed bg-brand-50/70 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-xl bg-brand-100 p-2.5 text-brand-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 font-medium text-brand-900">
              AI-generated practice — coming soon
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                <Lock className="h-3 w-3" />
                locked for now
              </span>
            </p>
            <p className="text-sm text-zinc-500">
              Endless, never-repeating question sets tuned to exactly what you
              want to drill.
            </p>
          </div>
        </div>
      </Card>

      {/* Interactive preview of the future controls */}
      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700/70">
          Preview the controls
        </p>

        {/* Area selector */}
        <div className="mt-3 inline-flex flex-wrap rounded-xl border border-brand-200 bg-white p-0.5">
          {AREAS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => setArea(a.value)}
              className={cn(
                "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                area === a.value
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-zinc-500 hover:text-brand-700"
              )}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Question-type toggle chips (multi-select) */}
        <p className="mt-4 text-xs font-medium text-brand-900/70">
          What should the set drill? Pick as many as you like.
        </p>
        <div key={area} className="animate-fade-up mt-2 flex flex-wrap gap-2">
          {current.types.map((t) => {
            const on = picked.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggle(t)}
                aria-pressed={on}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  on
                    ? "border-brand-300 bg-brand-100 text-brand-800"
                    : "border-brand-200 bg-white text-zinc-500 hover:bg-brand-50 hover:text-brand-700"
                )}
              >
                {on && <Check className="h-3.5 w-3.5 text-brand-600" />}
                {t}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button disabled>
            <Sparkles className="h-4 w-4" />
            Generate my set — coming soon
          </Button>
          <p className="text-xs text-zinc-400">
            {picked.length === 0
              ? "pick at least one question type"
              : `${picked.length} question ${picked.length === 1 ? "type" : "types"} queued for ${current.label.toLowerCase()}`}
          </p>
        </div>
      </Card>

      {/* Honest note */}
      <p className="flex items-start gap-1.5 px-1 text-xs text-zinc-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" />
        <span>
          The Math Gym next door never repeats — it builds every question
          fresh. This tab is for the reasoning-heavy stuff that needs a brain
          on the other end.
        </span>
      </p>
    </div>
  );
}
