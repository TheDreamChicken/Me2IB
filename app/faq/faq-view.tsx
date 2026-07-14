"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, cn } from "@/components/ui";
import { FAQ_SECTIONS, type AnswerBlock, type FaqItem } from "./content";

/* ------------------------------------------------------------------ */
/* Tiny inline **bold** renderer for content strings                   */
/* ------------------------------------------------------------------ */

function withBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-brand-800">
        {part}
      </strong>
    ) : (
      part
    )
  );
}

/* ------------------------------------------------------------------ */
/* Answer blocks                                                       */
/* ------------------------------------------------------------------ */

function AnswerBlocks({ blocks }: { blocks: AnswerBlock[] }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-zinc-600">
      {blocks.map((block, i) => {
        if (block.kind === "p") {
          return <p key={i}>{withBold(block.text)}</p>;
        }
        if (block.kind === "list") {
          return (
            <ul key={i} className="space-y-2">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" />
                  <span>{withBold(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        // example panel (e.g. the cold email)
        return (
          <div
            key={i}
            className="rounded-xl border border-brand-200 bg-brand-50/70 p-4"
          >
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-brand-600">
              {block.title}
            </p>
            <div className="space-y-2 text-sm leading-relaxed text-brand-900/80">
              {block.lines.map((line, j) => (
                <p key={j}>{withBold(line)}</p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Accordion item                                                      */
/* ------------------------------------------------------------------ */

function AccordionItem({
  item,
  open,
  onToggle,
}: {
  item: FaqItem;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-brand-50/60"
      >
        <span
          className={cn(
            "text-sm font-medium",
            open ? "text-brand-700" : "text-brand-900 group-hover:text-brand-700"
          )}
        >
          {item.question}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-brand-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="animate-fade-up px-5 pb-5">
          <AnswerBlocks blocks={item.answer} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function FaqView() {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-16">
      {/* Section jump links */}
      <nav className="mb-10 flex flex-wrap justify-center gap-2">
        {FAQ_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-full border border-brand-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
          >
            {section.title}
          </a>
        ))}
      </nav>

      <div className="space-y-10">
        {FAQ_SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-xl bg-brand-100 p-2.5 text-brand-600">
                <section.icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-brand-900">
                  {section.title}
                </h2>
                <p className="text-sm text-zinc-500">{section.blurb}</p>
              </div>
            </div>
            <Card className="divide-y divide-brand-100 overflow-hidden">
              {section.items.map((item) => (
                <AccordionItem
                  key={item.id}
                  item={item}
                  open={openIds.has(item.id)}
                  onToggle={() => toggle(item.id)}
                />
              ))}
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
