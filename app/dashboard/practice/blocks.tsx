"use client";

// Shared renderers for Practice content: inline bold, content blocks
// (paragraph / list / steps / example / reveal), the Q&A accordion, and
// the two-flavor worked-example toggle.

import { useState } from "react";
import { ChevronDown, FlaskConical } from "lucide-react";
import { Card, cn } from "@/components/ui";
import { useLearningPref } from "@/components/learning-prefs";
import { GlossaryText } from "./term-hover";
import type { ContentBlock, PracticeItem, WorkedExample } from "./content";

/* ------------------------------------------------------------------ */
/* Inline **bold** rendering (+ hoverable glossary terms)              */
/* ------------------------------------------------------------------ */

export function Inline({ text }: { text: string }) {
  const parts = text.split("**");
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-brand-900">
            <GlossaryText text={part} />
          </strong>
        ) : (
          <span key={i}>
            <GlossaryText text={part} />
          </span>
        )
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Content blocks                                                      */
/* ------------------------------------------------------------------ */

function Reveal({ label, blocks }: { label: string; blocks: ContentBlock[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-brand-100 bg-white/70">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2.5 text-left text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50"
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-brand-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
        {label}
      </button>
      {open && (
        <div className="animate-fade-up px-3.5 pb-3.5">
          <Blocks blocks={blocks} />
        </div>
      )}
    </div>
  );
}

export function Blocks({ blocks }: { blocks: ContentBlock[] }) {
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
        if (block.type === "reveal") {
          return <Reveal key={i} label={block.label} blocks={block.blocks} />;
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
/* Worked example: two selectable versions                             */
/* ------------------------------------------------------------------ */

const EXAMPLE_VERSIONS = [
  { value: "simple", label: "Keep it simple" },
  { value: "real", label: "The real deal" },
] as const;

type ExampleVersion = (typeof EXAMPLE_VERSIONS)[number]["value"];

function WorkedExampleToggle({ example }: { example: WorkedExample }) {
  const [open, setOpen] = useState(false);
  // Default flavor follows the "worked" learning preference until the user
  // picks a version by hand in this instance.
  const [workedPref] = useLearningPref("worked");
  const [override, setOverride] = useState<ExampleVersion | null>(null);
  const version = override ?? (workedPref === "detailed" ? "real" : "simple");
  const setVersion = (v: ExampleVersion) => setOverride(v);
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
          open
            ? "border-brand-300 bg-brand-100 text-brand-800"
            : "border-brand-200 bg-white text-brand-700 hover:bg-brand-50"
        )}
      >
        <FlaskConical className="h-3.5 w-3.5" />
        {open ? "Hide worked example" : "View worked example"}
      </button>
      {open && (
        <div className="mt-3 animate-fade-up rounded-xl border border-brand-100 bg-brand-50/60 p-4">
          <div className="mb-3 inline-flex rounded-lg border border-brand-200 bg-white p-0.5">
            {EXAMPLE_VERSIONS.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => setVersion(v.value)}
                className={cn(
                  "cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  version === v.value
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-zinc-500 hover:text-brand-700"
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div key={version} className="animate-fade-up">
            <Blocks blocks={example[version]} />
          </div>
        </div>
      )}
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
            {item.workedExample && (
              <WorkedExampleToggle example={item.workedExample} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Accordion({ items }: { items: PracticeItem[] }) {
  return (
    <Card className="divide-y divide-brand-100">
      {items.map((item) => (
        <AccordionRow key={item.question} item={item} />
      ))}
    </Card>
  );
}
