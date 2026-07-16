"use client";

// Key Terms tab: selectable term chips + an expanding detail panel with a
// one-line definition and a "Go deeper" expandable.

import { useState } from "react";
import { ChevronDown, KeyRound } from "lucide-react";
import { Card, cn } from "@/components/ui";
import { KEY_TERMS, type KeyTerm } from "./content-terms";
import { Inline } from "./blocks";

export function KeyTermsTab() {
  const [selected, setSelected] = useState<string | null>(null);
  const active = KEY_TERMS.find((t) => t.term === selected) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {KEY_TERMS.map((t) => {
          const isActive = t.term === selected;
          return (
            <button
              key={t.term}
              type="button"
              onClick={() => setSelected(isActive ? null : t.term)}
              aria-pressed={isActive}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                  : "border-brand-200 bg-white/85 text-brand-800 hover:border-brand-300 hover:bg-brand-50"
              )}
            >
              {t.term}
            </button>
          );
        })}
      </div>

      {active ? (
        // key resets the "Go deeper" state when switching terms
        <TermPanel key={active.term} term={active} />
      ) : (
        <p className="flex items-center gap-1.5 px-1 text-sm text-zinc-400">
          <KeyRound className="h-4 w-4 shrink-0 text-brand-300" />
          Tap any term for the plain-English version.
        </p>
      )}
    </div>
  );
}

function TermPanel({ term }: { term: KeyTerm }) {
  const [deep, setDeep] = useState(false);
  return (
    <Card className="animate-fade-up p-5">
      <h3 className="font-semibold text-brand-900">{term.term}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
        {term.plain}
      </p>
      <button
        type="button"
        onClick={() => setDeep((d) => !d)}
        aria-expanded={deep}
        className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            deep && "rotate-180"
          )}
        />
        {deep ? "Enough depth, thanks" : "Go deeper"}
      </button>
      {deep && (
        <div className="mt-3 animate-fade-up space-y-3 rounded-xl bg-brand-50/70 p-4">
          <DeeperRow label="The mechanics" text={term.deeper.detail} />
          <DeeperRow label="Why it matters" text={term.deeper.why} />
          <DeeperRow label="The interview trap" text={term.deeper.trap} />
        </div>
      )}
    </Card>
  );
}

function DeeperRow({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700/80">
        {label}
      </p>
      <p className="mt-0.5 text-sm leading-relaxed text-zinc-600">
        <Inline text={text} />
      </p>
    </div>
  );
}
