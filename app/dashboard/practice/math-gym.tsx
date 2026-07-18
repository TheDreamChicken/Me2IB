"use client";

// Math Gym: four procedurally-generated timed rounds (drills, big numbers,
// word problems, table reading) plus honest links to external trainers.
// Personal bests persist per mode+difficulty in localStorage.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Dumbbell,
  ExternalLink,
  Eye,
  Flame,
  PartyPopper,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Trophy,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { Button, Card, cn } from "@/components/ui";
import {
  DIFFICULTIES,
  MODES,
  isCorrect,
  makeGymQuestion,
  type Difficulty,
  type GymMode,
  type GymQuestion,
  type TableData,
} from "./gym-generators";

const BEST_KEY = "me2ib-mathgym-best";

type Phase = "idle" | "running" | "done";
/** Personal bests, keyed `${mode}-${difficulty}` ("drills-chill", "tables-locked"…). */
type Bests = Record<string, number>;

function bestKeyFor(mode: GymMode, difficulty: Difficulty) {
  return `${mode}-${difficulty}`;
}

/* ------------------------------------------------------------------ */
/* Personal best storage (migrates legacy shapes gracefully)           */
/* ------------------------------------------------------------------ */

export function readBests(): Bests {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "number") {
      // oldest format: a single plain number (the drills best)
      return { "drills-chill": parsed, "drills-locked": parsed };
    }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Bests = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v !== "number") continue;
        // legacy format: { chill, locked } meant the drills sprint
        const key = k === "chill" || k === "locked" ? `drills-${k}` : k;
        out[key] = Math.max(out[key] ?? 0, v);
      }
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/* Confetti (pure CSS, only rendered on a new personal best)           */
/* ------------------------------------------------------------------ */

const CONFETTI_COLORS = ["#8451ec", "#b79bfb", "#d3c2fe", "#f59e0b", "#34d399"];
const CONFETTI_PIECES = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  delay: ((i * 17) % 40) / 100,
  duration: 1.3 + ((i * 29) % 90) / 100,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: 6 + ((i * 23) % 60) / 10,
  drift: -50 + ((i * 41) % 100),
}));

function Confetti() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
    >
      <style>{`@keyframes me2ib-confetti-fall {
        0% { transform: translate3d(0, -12px, 0) rotate(0deg); opacity: 1; }
        100% { transform: translate3d(var(--drift), 340px, 0) rotate(540deg); opacity: 0; }
      }`}</style>
      {CONFETTI_PIECES.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 rounded-[2px]"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.6,
              background: p.color,
              animation: `me2ib-confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
              "--drift": `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Exhibit table (Tables mode)                                         */
/* ------------------------------------------------------------------ */

function ExhibitTable({ table }: { table: TableData }) {
  return (
    <div className="mx-auto mt-4 w-full max-w-md overflow-x-auto">
      <div className="min-w-[18rem] overflow-hidden rounded-xl border border-brand-100 bg-white">
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="bg-brand-50">
            <tr>
              {table.columns.map((c, i) => (
                <th
                  key={c}
                  className={cn(
                    "px-3 py-2 font-semibold text-brand-800",
                    i === 0 ? "text-left" : "text-right"
                  )}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {table.rows.map((r) => (
              <tr key={r.label}>
                <td className="px-3 py-1.5 text-left font-medium text-brand-900">
                  {r.label}
                </td>
                {r.values.map((v, i) => (
                  <td
                    key={i}
                    className="px-3 py-1.5 text-right tabular-nums text-zinc-600"
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The game                                                            */
/* ------------------------------------------------------------------ */

function MathSprint() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<GymMode>("drills");
  const [difficulty, setDifficulty] = useState<Difficulty>("chill");
  const [question, setQuestion] = useState<GymQuestion | null>(null);
  const [value, setValue] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MODES[0].seconds);
  const [bests, setBests] = useState<Bests>({});
  const [newBest, setNewBest] = useState(false);
  const [lastResult, setLastResult] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  // Word/Tables only: answer reveal after a miss. Non-sticky = the brief
  // auto-advancing flash; sticky = a See-answer review that waits for the user.
  const [feedback, setFeedback] = useState<{
    text: string;
    solution?: string;
    sticky: boolean;
  } | null>(null);
  // True while the round clock is stopped for a review (flash or sticky).
  const [paused, setPaused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const endAtRef = useRef(0);
  // Remaining ms captured when the clock pauses; null while the clock is live.
  const pausedLeftRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const endRound = useCallback(() => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    setPaused(false);
    setFeedback(null);
    pausedLeftRef.current = null;
    setPhase("done");
  }, []);

  const modeMeta = MODES.find((m) => m.value === mode) ?? MODES[0];
  const roundSeconds = modeMeta.seconds;
  const diffLabel = difficulty === "chill" ? "Chill" : "Locked in";

  // localStorage is browser-only — read after mount.
  useEffect(() => {
    const id = setTimeout(() => setBests(readBests()), 0);
    return () => clearTimeout(id);
  }, []);

  // Countdown while running (and not paused for a review).
  useEffect(() => {
    if (phase !== "running" || paused) return;
    const id = setInterval(() => {
      const left = Math.max(0, (endAtRef.current - Date.now()) / 1000);
      setTimeLeft(left);
      if (left <= 0) endRound();
    }, 100);
    return () => clearInterval(id);
  }, [phase, paused, endRound]);

  // Escape ends the round early (same as the End round button).
  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") endRound();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, endRound]);

  // Enter advances out of a sticky See-answer review. (The input is readOnly
  // during a review, so the form won't also submit.) No deps array on purpose:
  // resubscribing each render keeps advanceFromReview's closure fresh.
  useEffect(() => {
    if (phase !== "running" || !feedback?.sticky) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        advanceFromReview();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Cancel any pending wrong-answer flash when the round stops. endRound()
  // resets pause state for explicit/clock endings; start() does it for a new run.
  useEffect(() => {
    if (phase === "running") return;
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    pausedLeftRef.current = null;
  }, [phase]);
  useEffect(
    () => () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    },
    []
  );

  // Save personal best (per mode+difficulty) when a round ends.
  useEffect(() => {
    if (phase !== "done") return;
    const id = setTimeout(() => {
      const key = bestKeyFor(mode, difficulty);
      const prev = readBests();
      if (score > (prev[key] ?? 0)) {
        const next = { ...prev, [key]: score };
        try {
          localStorage.setItem(BEST_KEY, JSON.stringify(next));
        } catch {
          // storage unavailable — best just won't persist
        }
        setBests(next);
        setNewBest((prev[key] ?? 0) > 0);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [phase, score, mode, difficulty]);

  function start() {
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setAnswered(0);
    setNewBest(false);
    setLastResult(null);
    setFeedback(null);
    setPaused(false);
    pausedLeftRef.current = null;
    setQuestion(makeGymQuestion(mode, difficulty));
    setValue("");
    endAtRef.current = Date.now() + roundSeconds * 1000;
    setTimeLeft(roundSeconds);
    setPhase("running");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // The clock is an absolute deadline (endAtRef), so pausing must snapshot the
  // remainder and push the deadline forward on resume — freezing the display
  // alone would still let the deadline expire.
  function pauseClock() {
    pausedLeftRef.current = Math.max(0, endAtRef.current - Date.now());
    setPaused(true);
  }

  function resumeClock() {
    if (pausedLeftRef.current !== null) {
      endAtRef.current = Date.now() + pausedLeftRef.current;
      pausedLeftRef.current = null;
    }
    setPaused(false);
  }

  /** Close the open review (flash or sticky), restart the clock, deal the next question. */
  function advanceFromReview() {
    setFeedback(null);
    resumeClock();
    setQuestion(makeGymQuestion(mode, difficulty));
    setValue("");
    inputRef.current?.focus();
  }

  /** Give up on the current question: counts as attempted + wrong, opens a sticky review. */
  function seeAnswer() {
    if (phase !== "running" || !question || feedback) return;
    setAnswered((a) => a + 1);
    setStreak(0);
    setLastResult(null);
    setValue("");
    pauseClock();
    setFeedback({
      text: question.answerText,
      solution: question.solution,
      sticky: true,
    });
  }

  function filterInput(raw: string) {
    if (question?.kind === "text") {
      return raw.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3);
    }
    if (mode === "drills") return raw.replace(/[^\d-]/g, "");
    // big-number-friendly: digits plus commas, spaces, $, dots, k/m/b
    return raw.replace(/[^\d\s,.$kKmMbB-]/g, "");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== "running" || !question || feedback) return;
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "-") return;

    const ok = isCorrect(question, trimmed);
    const showsFlash = mode === "word" || mode === "tables";
    setAnswered((a) => a + 1);

    if (ok) {
      const nextStreak = streak + 1;
      setScore((s) => s + 1);
      setStreak(nextStreak);
      if (nextStreak > bestStreak) setBestStreak(nextStreak);
      setLastResult({
        ok: true,
        text: showsFlash
          ? `nailed it — ${question.answerText}`
          : `${question.prompt} = ${question.answerText}`,
      });
    } else if (showsFlash) {
      // Word problems & tables: stop the clock ~1.2s and show the correct
      // answer (a miss shouldn't also cost reading time).
      setStreak(0);
      setLastResult(null);
      setValue("");
      pauseClock();
      setFeedback({ text: question.answerText, sticky: false });
      feedbackTimerRef.current = setTimeout(() => {
        feedbackTimerRef.current = null;
        advanceFromReview();
      }, 1200);
      return;
    } else {
      setStreak(0);
      setLastResult({
        ok: false,
        text: `${question.prompt} = ${question.answerText}`,
      });
    }
    setQuestion(makeGymQuestion(mode, difficulty));
    setValue("");
  }

  const running = phase === "running";
  const timeFraction = timeLeft / roundSeconds;
  const best = bests[bestKeyFor(mode, difficulty)] ?? 0;
  const sentenceMode = mode === "word" || mode === "tables";
  const hint =
    question?.note ?? (mode === "bignum" ? "shortcuts work: 2.4m, 350k" : null);

  return (
    <Card className="relative p-5 sm:p-6">
      {phase === "done" && newBest && <Confetti />}

      {/* Mode picker (setup only) */}
      {phase === "idle" && (
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {MODES.map((m) => {
            const active = m.value === mode;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={cn(
                  "cursor-pointer rounded-xl border p-3 text-left transition-colors",
                  active
                    ? "border-brand-400 bg-brand-50 ring-1 ring-brand-300"
                    : "border-brand-100 bg-white hover:border-brand-300"
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      active ? "text-brand-800" : "text-brand-900"
                    )}
                  >
                    {m.label}
                  </span>
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-brand-700">
                    {m.seconds}s
                  </span>
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {m.blurb}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Top row: difficulty (idle) / round summary chip, best, End round */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {phase === "idle" ? (
          <div className="inline-flex rounded-xl border border-brand-200 bg-white p-0.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDifficulty(d.value)}
                title={d.blurb}
                className={cn(
                  "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  difficulty === d.value
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-zinc-500 hover:text-brand-700"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
            <Dumbbell className="h-3.5 w-3.5" />
            {modeMeta.label} · {diffLabel}
          </span>
        )}
        <div className="flex items-center gap-2">
          <p className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Trophy className="h-3.5 w-3.5 text-brand-400" />
            Personal best ({modeMeta.label}, {diffLabel}):{" "}
            <span className="font-semibold text-brand-900">{best}</span>
          </p>
          {running && (
            <Button variant="ghost" size="sm" onClick={endRound}>
              <XCircle className="h-3.5 w-3.5" />
              End round
            </Button>
          )}
        </div>
      </div>

      {/* Countdown bar (amber while the clock is paused for a review) */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-brand-100">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-100 ease-linear",
            paused
              ? "bg-amber-400"
              : running && timeLeft <= 10
                ? "bg-rose-400"
                : "bg-brand-500"
          )}
          style={{ width: `${(running ? timeFraction : 1) * 100}%` }}
        />
      </div>

      {phase === "idle" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="rounded-2xl bg-brand-100 p-3 text-brand-600">
            <Dumbbell className="h-6 w-6" />
          </div>
          <p className="max-w-md text-sm text-zinc-500">{modeMeta.idle}</p>
          <Button onClick={start} className="mt-1">
            <Play className="h-4 w-4" />
            Start the round
          </Button>
        </div>
      )}

      {running && question && (
        <div className="py-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">
              <Check className="h-3.5 w-3.5" />
              {score}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                streak >= 5
                  ? "bg-amber-100 text-amber-700"
                  : "bg-brand-50 text-brand-600"
              )}
            >
              {streak >= 5 ? (
                <Flame className="h-3.5 w-3.5" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              streak {streak}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                paused ? "bg-amber-100 text-amber-700" : "bg-brand-50 text-brand-600"
              )}
            >
              {paused && <Pause className="h-3.5 w-3.5" />}
              {Math.ceil(timeLeft)}s{paused && " · paused for review"}
            </span>
          </div>

          <p
            className={cn(
              "mx-auto mt-6 text-center text-brand-900",
              sentenceMode
                ? "max-w-xl text-lg font-medium leading-relaxed sm:text-xl"
                : "text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl"
            )}
          >
            {question.prompt}
          </p>

          {question.table && <ExhibitTable table={question.table} />}

          <form
            onSubmit={submit}
            className={cn(
              "mx-auto mt-5",
              mode === "drills" ? "max-w-[11rem]" : "max-w-[14rem]"
            )}
          >
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(filterInput(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !feedback) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              readOnly={!!feedback}
              inputMode={mode === "drills" ? "numeric" : undefined}
              autoComplete="off"
              aria-label="Your answer"
              placeholder="= ?"
              className={cn(
                "w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-center text-xl font-semibold text-brand-900 tabular-nums placeholder:text-zinc-300 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-300",
                feedback && "opacity-60"
              )}
            />
            <button type="submit" className="sr-only">
              Submit answer
            </button>
          </form>

          {sentenceMode && !feedback && (
            <div className="mt-2 flex justify-center">
              <Button type="button" variant="ghost" size="sm" onClick={seeAnswer}>
                <Eye className="h-3.5 w-3.5" />
                See answer
              </Button>
            </div>
          )}

          {hint && (
            <p className="mt-1.5 text-center text-[11px] text-zinc-400">
              {hint}
            </p>
          )}

          {feedback ? (
            feedback.sticky ? (
              // bg-amber-50 (no opacity modifier) so the dark-theme remap applies
              <div className="animate-fade-up mx-auto mt-4 max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                <p className="flex items-center justify-center gap-1 text-xs font-semibold text-rose-500">
                  <X className="h-3.5 w-3.5" />
                  The answer was {feedback.text}
                </p>
                {feedback.solution && (
                  <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                    {feedback.solution}
                  </p>
                )}
                <Button
                  type="button"
                  size="sm"
                  className="mt-3"
                  onClick={advanceFromReview}
                >
                  Next question
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <p className="mt-1.5 text-[11px] text-zinc-400">
                  or press Enter — the clock is paused
                </p>
              </div>
            ) : (
              <p className="animate-fade-up mt-3 flex min-h-5 items-center justify-center gap-1 text-center text-xs font-semibold text-rose-500">
                <X className="h-3.5 w-3.5" />
                The answer was {feedback.text}
              </p>
            )
          ) : (
            <p
              className={cn(
                "mt-3 flex min-h-5 items-center justify-center gap-1 text-center text-xs font-medium",
                lastResult
                  ? lastResult.ok
                    ? "text-emerald-600"
                    : "text-rose-500"
                  : "text-transparent"
              )}
            >
              {lastResult &&
                (lastResult.ok ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                ))}
              {lastResult ? lastResult.text : "–"}
            </p>
          )}
        </div>
      )}

      {phase === "done" && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          {newBest ? (
            <>
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-600">
                <PartyPopper className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-brand-700">
                New personal best — the training is working.
              </p>
            </>
          ) : (
            <div className="rounded-2xl bg-brand-100 p-3 text-brand-600">
              <Trophy className="h-6 w-6" />
            </div>
          )}
          <p className="text-4xl font-semibold text-brand-900 tabular-nums">
            {score}
          </p>
          <p className="text-xs text-zinc-400">
            {answered} attempted · best streak {bestStreak} · personal best{" "}
            {best}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <Button onClick={start}>
              <RotateCcw className="h-4 w-4" />
              Run it back
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setNewBest(false);
                setPhase("idle");
              }}
            >
              <Settings2 className="h-4 w-4" />
              Change mode
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* External trainers                                                   */
/* ------------------------------------------------------------------ */

const TRAINERS: { name: string; href: string; blurb: string }[] = [
  {
    name: "Zetamac Arithmetic",
    href: "https://arithmetic.zetamac.com",
    blurb:
      "The classic trader warm-up. Bare-bones, brutal, free — set it to 120 seconds and chase your average.",
  },
  {
    name: "RocketBlocks",
    href: "https://www.rocketblocks.me",
    blurb:
      "Consulting-specific drills — chart reading and math in case context. Paid, but polished and worth it if you're deep in case prep.",
  },
  {
    name: "PrepLounge mental math",
    href: "https://www.preplounge.com/en/mental-math.php",
    blurb:
      "Case-style mental math with a usable free tier, plus a big community of case partners.",
  },
];

function TrainElsewhere() {
  return (
    <div>
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-brand-700/70">
        Train elsewhere
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {TRAINERS.map((t) => (
          <a
            key={t.name}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Card className="h-full p-4 transition-all hover:-translate-y-0.5 hover:border-brand-300">
              <p className="flex items-center gap-1.5 text-sm font-medium text-brand-900">
                {t.name}
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-brand-400" />
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                {t.blurb}
              </p>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab                                                                 */
/* ------------------------------------------------------------------ */

export function MathGymTab() {
  return (
    <div className="space-y-5">
      <MathSprint />
      <TrainElsewhere />
    </div>
  );
}
