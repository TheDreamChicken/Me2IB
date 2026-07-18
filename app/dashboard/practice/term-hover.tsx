"use client";

// Hoverable key terms: any glossary phrase inside Practice content gets a
// dotted underline; hovering (or tapping) opens a portal popover with the
// simple blurb and a Simple/Detailed toggle. The default depth follows the
// "terms" learning preference (Settings -> Learning depth).

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/components/ui";
import { useLearningPref, type Depth } from "@/components/learning-prefs";
import { KEY_TERMS, TERM_ALIASES, type KeyTerm } from "./content-terms";

/* ------------------------------------------------------------------ */
/* Alias matching (compiled once)                                      */
/* ------------------------------------------------------------------ */

const TERM_BY_NAME = new Map(KEY_TERMS.map((t) => [t.term, t]));

const ALIAS_TO_TERM = new Map<string, KeyTerm>();
for (const [termName, aliases] of Object.entries(TERM_ALIASES)) {
  const term = TERM_BY_NAME.get(termName);
  if (!term) continue;
  for (const alias of aliases) ALIAS_TO_TERM.set(alias.toLowerCase(), term);
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Longest-first so "unlevered free cash flow" beats "free cash flow" & "EV".
const GLOSSARY_RE = new RegExp(
  "\\b(" +
    [...ALIAS_TO_TERM.keys()]
      .sort((a, b) => b.length - a.length)
      .map(escapeRegex)
      .join("|") +
    ")\\b",
  "gi"
);

/** Splits text and wraps glossary phrases in hoverable spans. */
export function GlossaryText({ text }: { text: string }) {
  const parts = text.split(GLOSSARY_RE);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) => {
        const term = ALIAS_TO_TERM.get(part.toLowerCase());
        // split() with a capture group alternates plain / matched parts
        if (i % 2 === 1 && term) {
          return (
            <TermHover key={i} term={term}>
              {part}
            </TermHover>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* The hover popover                                                   */
/* ------------------------------------------------------------------ */

const POP_WIDTH = 300;

function TermHover({ term, children }: { term: KeyTerm; children: string }) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pos, setPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    maxH: number;
  } | null>(null);
  const [prefDepth] = useLearningPref("terms");
  const [override, setOverride] = useState<Depth | null>(null);
  const depth = override ?? prefDepth;

  function openNow() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(
      Math.max(8, rect.left + rect.width / 2 - POP_WIDTH / 2),
      window.innerWidth - POP_WIDTH - 8
    );
    const above = rect.top > 220;
    // Anchor the "above" case with CSS `bottom` (no inline transform) so it
    // can't fight the animate-fade-up keyframe, which animates transform.
    // maxH clamps the box inside the viewport: detailed mode can run taller
    // than the space between the trigger and the screen edge.
    setPos(
      above
        ? { bottom: window.innerHeight - rect.top + 8, left, maxH: rect.top - 16 }
        : {
            top: rect.bottom + 8,
            left,
            maxH: window.innerHeight - rect.bottom - 16,
          }
    );
  }

  function scheduleOpen() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (pos) return;
    openTimer.current = setTimeout(openNow, 300);
  }

  function scheduleClose() {
    if (openTimer.current) clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => {
      setPos(null);
      setOverride(null);
    }, 180);
  }

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  // Close when the page moves, but keep the popover open while the user
  // scrolls its own detailed content.
  useEffect(() => {
    if (!pos) return;
    const close = () => {
      setPos(null);
      setOverride(null);
    };
    const onScroll = (event: Event) => {
      const target = event.target;
      if (
        popRef.current &&
        target instanceof Node &&
        popRef.current.contains(target)
      ) {
        return;
      }
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [pos]);

  useEffect(
    () => () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocus={openNow}
        onBlur={scheduleClose}
        onClick={(e) => {
          e.stopPropagation();
          if (pos) {
            setPos(null);
            setOverride(null);
          } else {
            openNow();
          }
        }}
        className="cursor-help rounded-sm border-b border-dotted border-brand-400 text-inherit outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        {children}
      </span>

      {pos &&
        createPortal(
          <div
            ref={popRef}
            role="tooltip"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            style={{
              position: "fixed",
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              width: POP_WIDTH,
              maxHeight: pos.maxH,
              overflowY: "auto",
              zIndex: 60,
            }}
            className="animate-fade-up rounded-xl border border-brand-200 bg-white p-3.5 shadow-lg card-shadow"
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-brand-900">{term.term}</p>
              <div className="inline-flex shrink-0 rounded-lg border border-brand-200 bg-white p-0.5">
                {(["simple", "detailed"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Belt-and-braces: a resize mid-toggle must never
                      // let a pending close win.
                      cancelClose();
                      setOverride(d);
                    }}
                    className={cn(
                      "cursor-pointer rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
                      depth === d
                        ? "bg-brand-600 text-white"
                        : "text-zinc-500 hover:text-brand-700"
                    )}
                  >
                    {d === "simple" ? "Simple" : "Detailed"}
                  </button>
                ))}
              </div>
            </div>
            {depth === "simple" ? (
              <p className="text-xs leading-relaxed text-zinc-600">{term.plain}</p>
            ) : (
              // Detailed is a superset of simple: plain first, then depth.
              <div className="space-y-1.5">
                <p className="text-xs leading-relaxed text-zinc-600">{term.plain}</p>
                <p className="text-xs leading-relaxed text-zinc-600">
                  {term.deeper.detail}
                </p>
                <p className="text-xs leading-relaxed text-zinc-600">
                  <span className="font-semibold text-brand-700">Why it matters: </span>
                  {term.deeper.why}
                </p>
                <p className="text-xs leading-relaxed text-zinc-600">
                  <span className="font-semibold text-brand-700">Watch out: </span>
                  {term.deeper.trap}
                </p>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
