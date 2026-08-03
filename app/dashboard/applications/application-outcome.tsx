"use client";

import {
  APPLICATION_OUTCOMES,
  applicationOutcomeFor,
  labelFor,
  type ApplicationOutcomeValue,
} from "@/lib/constants";
import { Badge, cn } from "@/components/ui";

export type ApplicationOutcome = ApplicationOutcomeValue;

const ACTIVE_STYLES: Record<ApplicationOutcome, string> = {
  rejected: "border-rose-200 bg-rose-100 text-rose-700 shadow-sm",
  waiting: "border-amber-200 bg-amber-100 text-amber-800 shadow-sm",
  accepted: "border-emerald-200 bg-emerald-100 text-emerald-700 shadow-sm",
};

/** Translate legacy combined statuses into the new separate outcome field. */
export function normalizeApplicationOutcome(
  outcome: string | null | undefined,
  legacyStatus?: string | null
): ApplicationOutcome {
  return applicationOutcomeFor(outcome, legacyStatus);
}

export function OutcomeBadge({ outcome }: { outcome: ApplicationOutcome }) {
  const info = APPLICATION_OUTCOMES.find((item) => item.value === outcome);
  return (
    <Badge className={info?.color ?? "bg-zinc-100 text-zinc-600"}>
      {labelFor(APPLICATION_OUTCOMES, outcome)}
    </Badge>
  );
}

export function OutcomePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: ApplicationOutcome;
  onChange: (value: ApplicationOutcome) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Application outcome"
      className="grid grid-cols-3 gap-1 rounded-2xl border border-brand-100 bg-brand-50/70 p-1"
    >
      {APPLICATION_OUTCOMES.map((outcome) => {
        const selected = outcome.value === value;
        return (
          <button
            key={outcome.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => {
              if (!selected) onChange(outcome.value);
            }}
            className={cn(
              "min-h-10 rounded-xl border border-transparent px-2 py-2 text-[11px] font-medium leading-tight transition-colors sm:text-xs",
              selected
                ? ACTIVE_STYLES[outcome.value]
                : "text-zinc-500 hover:bg-white hover:text-brand-800",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            {outcome.label}
          </button>
        );
      })}
    </div>
  );
}
