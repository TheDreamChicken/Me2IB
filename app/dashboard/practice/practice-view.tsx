"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Briefcase,
  ChevronDown,
  Landmark,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import { Button, Card, PageHeader, cn } from "@/components/ui";
import {
  PRACTICE_TABS,
  type ContentBlock,
  type PracticeItem,
  type PracticeTabValue,
} from "./content";

const TAB_ICONS: Record<PracticeTabValue, React.ElementType> = {
  finance: Landmark,
  consulting: Briefcase,
  behavioral: MessageSquareText,
};

/* ------------------------------------------------------------------ */
/* Inline **bold** rendering                                           */
/* ------------------------------------------------------------------ */

function Inline({ text }: { text: string }) {
  const parts = text.split("**");
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-brand-900">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function Blocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        if (block.type === "p") {
          return (
            <p key={i} className="text-sm leading-relaxed text-zinc-600">
              <Inline text={block.text} />
            </p>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="space-y-2">
              {block.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2.5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" />
                  <span className="text-sm leading-relaxed text-zinc-600">
                    <Inline text={item} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "steps") {
          return (
            <ol key={i} className="space-y-2">
              {block.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700">
                    {j + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-zinc-600">
                    <Inline text={item} />
                  </span>
                </li>
              ))}
            </ol>
          );
        }
        // example — a highlighted worked-answer panel
        return (
          <div
            key={i}
            className="space-y-2.5 rounded-xl border border-brand-100 bg-brand-50 p-4"
          >
            {block.items.map((item, j) => (
              <p key={j} className="text-sm leading-relaxed text-brand-900/80">
                <Inline text={item} />
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Accordion                                                           */
/* ------------------------------------------------------------------ */

function AccordionRow({ item }: { item: PracticeItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span
          className={cn(
            "text-sm font-medium transition-colors",
            open ? "text-brand-700" : "text-brand-900 group-hover:text-brand-700"
          )}
        >
          {item.question}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-brand-400 transition-transform duration-300",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5">
            <Blocks blocks={item.answer} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Accordion({ items }: { items: PracticeItem[] }) {
  return (
    <Card className="divide-y divide-brand-100">
      {items.map((item) => (
        <AccordionRow key={item.question} item={item} />
      ))}
    </Card>
  );
}

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
  const active = PRACTICE_TABS.find((t) => t.value === tab) ?? PRACTICE_TABS[0];

  return (
    <div>
      <PageHeader
        title="Practice"
        description="Real study material for the three interviews that matter: technicals, cases, and behaviorals."
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

      <div key={active.value} className="animate-fade-up space-y-4">
        <p className="max-w-3xl px-1 text-sm text-zinc-500">{active.intro}</p>

        <Accordion items={active.items} />

        {active.value === "behavioral" && <StoryBankCard />}

        <GoDeeperNote text={active.goDeeper} />
      </div>

      <div className="mt-8">
        <AiMockPlaceholder />
      </div>
    </div>
  );
}
