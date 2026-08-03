"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Check, RefreshCw, Sparkles } from "lucide-react";
import type { Document } from "@/lib/types";
import { callAI } from "@/lib/ai-client";
import { TierGate } from "@/components/tier-gate";
import { LocalDate } from "@/components/local-date";
import { saveDocumentAiFeedback } from "@/lib/actions/documents";
import { Button, Spinner } from "@/components/ui";

type AiFeedback = NonNullable<Document["ai_feedback"]>;

const FULL_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

/** AI document review (heat tier) — lives inside the detail modal. */
export function AiReviewSection({ doc }: { doc: Document }) {
  return (
    <TierGate
      feature="ai_review"
      title="AI document review"
      blurb="Brutally honest, line-quoting feedback tuned to your target industry."
      variant="card"
    >
      <ReviewPanel doc={doc} />
    </TierGate>
  );
}

function ReviewPanel({ doc }: { doc: Document }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    feedback: AiFeedback;
    at: string;
  } | null>(null);
  const [setup, setSetup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A fresh run wins over the row until revalidation catches up; on modal
  // reopen the component remounts and the persisted row feedback shows.
  const feedback = result?.feedback ?? doc.ai_feedback;
  const reviewedAt = result?.at ?? doc.ai_feedback_at;
  const hasPdf = !!doc.file_path?.toLowerCase().endsWith(".pdf");

  function runReview() {
    setError(null);
    setSetup(null);
    startTransition(async () => {
      const res = await callAI<AiFeedback>("review_document", {
        documentId: doc.id,
      });
      if (res.setup) {
        setSetup(res.setup);
        return;
      }
      if (res.upgrade) {
        // The TierGate should catch this first — belt and suspenders.
        setError(
          res.error ??
            `This needs the ${res.upgrade.neededLabel} plan — upgrade in Account → Plan.`
        );
        return;
      }
      if (res.error) {
        setError(res.error);
        return;
      }
      if (!res.data) {
        setError("No feedback came back — try again.");
        return;
      }
      setResult({ feedback: res.data, at: new Date().toISOString() });
      const persisted = await saveDocumentAiFeedback(doc.id, res.data);
      if (persisted.error) {
        setError(
          `Feedback is shown below but couldn't be saved: ${persisted.error}`
        );
      }
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-brand-900">
          <Sparkles className="h-4 w-4 text-brand-500" /> AI document review
        </p>
        {hasPdf && (
          <Button
            size="sm"
            variant={feedback ? "secondary" : "primary"}
            onClick={runReview}
            disabled={pending}
          >
            {pending ? (
              <Spinner />
            ) : feedback ? (
              <>
                <RefreshCw className="h-3.5 w-3.5" /> Re-run review
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" /> Review this document
              </>
            )}
          </Button>
        )}
      </div>

      {pending ? (
        <p className="text-xs text-zinc-500">
          Reading every line — this takes about 20–60 seconds…
        </p>
      ) : (
        !feedback &&
        !setup &&
        hasPdf && (
          <p className="text-xs text-zinc-500">
            Honest strengths + critical fixes, tuned to your target industry.
          </p>
        )
      )}

      {setup && (
        <div className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-xs leading-relaxed text-brand-700">
          <span className="font-medium">
            AI isn&apos;t set up yet — one quick step:
          </span>{" "}
          {setup}
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      {feedback && (
        <div className="space-y-3 rounded-xl bg-white p-4">
          {feedback.overview && (
            <p className="text-sm leading-relaxed text-brand-900">
              {feedback.overview}
            </p>
          )}
          {!!feedback.strengths?.length && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Strengths
              </p>
              <ul className="space-y-1.5">
                {feedback.strengths.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm leading-relaxed text-zinc-600"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!!feedback.improvements?.length && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600">
                To improve
              </p>
              <ul className="space-y-1.5">
                {feedback.improvements.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm leading-relaxed text-zinc-600"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {feedback.verdict && (
            <p className="rounded-xl bg-brand-100/70 px-3 py-2 text-sm font-medium text-brand-900">
              {feedback.verdict}
            </p>
          )}
          {reviewedAt && (
            <p className="text-xs text-zinc-400">
              Reviewed{" "}
              <LocalDate iso={reviewedAt} options={FULL_DATE_OPTIONS} />
            </p>
          )}
        </div>
      )}

      {!hasPdf && (
        <p className="rounded-xl border border-brand-100 bg-white px-3 py-2 text-xs leading-relaxed text-zinc-500">
          Upload a PDF to use AI review. The reviewer reads the file itself —
          there&apos;s nothing to paste.
        </p>
      )}
    </div>
  );
}
