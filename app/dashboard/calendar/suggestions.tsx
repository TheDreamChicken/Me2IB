"use client";

import { CheckCircle2, Lightbulb, Plus, Sparkles } from "lucide-react";
import { EVENT_TYPES, labelFor } from "@/lib/constants";
import { Badge, Button, Card, Spinner } from "@/components/ui";
import {
  formatDayKey,
  todayKey,
  typeColor,
  type Suggestion,
} from "./calendar-utils";

/** Rule-based nudges computed from contacts + applications (NOT the AI feature). */
export function SuggestionsPanel({
  suggestions,
  pendingKey,
  onAdd,
}: {
  suggestions: Suggestion[];
  pendingKey: string | null;
  onAdd: (s: Suggestion) => void;
}) {
  const today = todayKey();

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="rounded-xl bg-brand-100 p-2 text-brand-600">
          <Lightbulb className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-brand-900">
            Smart suggestions
          </h2>
          <p className="text-xs text-zinc-400">
            Nudges from your contacts &amp; applications.
          </p>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-brand-200 bg-brand-50/50 p-5 text-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          <p className="text-sm font-medium text-brand-900">
            Nothing needs attention
          </p>
          <p className="text-xs text-zinc-400">
            Overdue follow-ups, close deadlines, and next steps will pop up
            here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {suggestions.map((s) => (
            <li
              key={s.key}
              className="flex items-center gap-2 rounded-xl border border-brand-100 bg-white p-2.5"
            >
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium text-brand-900"
                  title={s.title}
                >
                  {s.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
                  <Badge className={typeColor(s.event_type)}>
                    {labelFor(EVENT_TYPES, s.event_type)}
                  </Badge>
                  <span>
                    {s.date === today ? "Today" : formatDayKey(s.date)} ·{" "}
                    {s.reason}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0"
                disabled={pendingKey !== null}
                onClick={() => onAdd(s)}
              >
                {pendingKey === s.key ? (
                  <Spinner />
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" /> Add
                  </>
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Placeholder only — AI event suggestions are not wired up in this build phase. */
export function AiEventsPlaceholder() {
  return (
    <Card className="border-dashed bg-brand-50 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-brand-100 p-2 text-brand-600">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-900">
            AI-suggested events — coming soon
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            AI will read your whole pipeline and propose prep sessions,
            outreach windows, and mock interviews for you.
          </p>
          <Button size="sm" variant="secondary" disabled className="mt-3">
            <Sparkles className="h-3.5 w-3.5" /> Coming soon
          </Button>
        </div>
      </div>
    </Card>
  );
}
