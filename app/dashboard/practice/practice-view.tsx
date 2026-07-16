"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Briefcase,
  Calculator,
  KeyRound,
  Landmark,
  MessageSquareText,
  MonitorPlay,
  Sparkles,
} from "lucide-react";
import { Button, Card, PageHeader, cn } from "@/components/ui";
import { PRACTICE_TABS, QA_TABS, type PracticeTabValue } from "./content";
import { ONLINE_ITEMS } from "./content-online";
import { Accordion } from "./blocks";
import { KeyTermsTab } from "./key-terms";
import { MathGymTab } from "./math-gym";

const TAB_ICONS: Record<PracticeTabValue, React.ElementType> = {
  finance: Landmark,
  consulting: Briefcase,
  behavioral: MessageSquareText,
  terms: KeyRound,
  mathgym: Calculator,
  online: MonitorPlay,
};

/* ------------------------------------------------------------------ */
/* Extra cards                                                         */
/* ------------------------------------------------------------------ */

function StoryBankCard() {
  return (
    <Link href="/dashboard/stories" className="block">
      <Card className="flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-brand-300">
        <div className="rounded-xl bg-brand-100 p-2.5 text-brand-600">
          <MessageSquareText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-brand-900">
            Store your answers in the Story Bank
          </p>
          <p className="text-sm text-zinc-500">
            Draft your six stories once, tag them by category, and polish them
            before every interview.
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-brand-400" />
      </Card>
    </Link>
  );
}

function MathGymJumpCard({ onOpen }: { onOpen: () => void }) {
  return (
    <Card className="flex flex-wrap items-center gap-4 p-5">
      <div className="rounded-xl bg-brand-100 p-2.5 text-brand-600">
        <Calculator className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-brand-900">
          The arithmetic games are 100% trainable
        </p>
        <p className="text-sm text-zinc-500">
          The 60-second sprints in the Math Gym are the closest thing to the
          real assessment format — streaks, clock, and all.
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={onOpen}>
        Open the Math Gym
      </Button>
    </Card>
  );
}

function GoDeeperNote({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-1.5 px-1 text-xs text-zinc-400">
      <BookOpenText className="h-3.5 w-3.5 shrink-0 text-brand-300" />
      <span>
        {text}{" "}
        <Link
          href="/dashboard/resources"
          className="font-medium text-brand-600 underline-offset-2 hover:text-brand-700 hover:underline"
        >
          Resources
        </Link>
        .
      </span>
    </p>
  );
}

function AiMockPlaceholder() {
  return (
    <Card className="border-dashed bg-brand-50/70 p-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="rounded-xl bg-brand-100 p-2.5 text-brand-600">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-brand-900">
            AI mock interviews — coming soon
          </p>
          <p className="text-sm text-zinc-500">
            Practice technicals, cases, and behaviorals against an AI
            interviewer that asks follow-ups and scores your answers.
          </p>
        </div>
        <Button disabled>Coming soon</Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function PracticeView() {
  const [tab, setTab] = useState<PracticeTabValue>("finance");
  const meta = PRACTICE_TABS.find((t) => t.value === tab) ?? PRACTICE_TABS[0];

  return (
    <div>
      <PageHeader
        title="Practice"
        description="Your prep gym: technicals, cases, stories, the jargon, math reps, and the robot interviews. Everything opens when you tap it — no walls of text."
      />

      {/* Segmented tabs */}
      <div className="mb-5 inline-flex flex-wrap gap-1 rounded-2xl border border-brand-100 bg-white/85 p-1 card-shadow">
        {PRACTICE_TABS.map((t) => {
          const Icon = TAB_ICONS[t.value];
          const isActive = t.value === tab;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-zinc-500 hover:bg-brand-50 hover:text-brand-700"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  isActive ? "text-brand-100" : "text-zinc-400"
                )}
              />
              {t.label}
            </button>
          );
        })}
      </div>

      <div key={tab} className="animate-fade-up space-y-4">
        <p className="max-w-3xl px-1 text-sm text-zinc-500">{meta.intro}</p>

        {tab === "finance" && (
          <>
            <Accordion items={QA_TABS.finance.items} />
            <GoDeeperNote text={QA_TABS.finance.goDeeper} />
          </>
        )}

        {tab === "consulting" && (
          <>
            <Accordion items={QA_TABS.consulting.items} />
            <GoDeeperNote text={QA_TABS.consulting.goDeeper} />
          </>
        )}

        {tab === "behavioral" && (
          <>
            <Accordion items={QA_TABS.behavioral.items} />
            <StoryBankCard />
            <GoDeeperNote text={QA_TABS.behavioral.goDeeper} />
          </>
        )}

        {tab === "terms" && <KeyTermsTab />}

        {tab === "mathgym" && <MathGymTab />}

        {tab === "online" && (
          <>
            <Accordion items={ONLINE_ITEMS} />
            <MathGymJumpCard onOpen={() => setTab("mathgym")} />
          </>
        )}
      </div>

      <div className="mt-8">
        <AiMockPlaceholder />
      </div>
    </div>
  );
}
