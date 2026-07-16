"use client";

// Math Gym: a built-in 60-second mental math sprint (no deps), plus honest
// links to external trainers. Personal best persists in localStorage.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Dumbbell,
  ExternalLink,
  Flame,
  PartyPopper,
  Play,
  RotateCcw,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { Button, Card, cn } from "@/components/ui";

const BEST_KEY = "me2ib-mathgym-best";
const ROUND_SECONDS = 60;

type Difficulty = "chill" | "locked";
type Phase = "idle" | "running" | "done";
type Question = { prompt: string; answer: number };
type Bests = Record<Difficulty, number>;

const DIFFICULTIES: {
  value: Difficulty;
  label: string;
  blurb: string;
}[] = [
  { value: "chill", label: "Chill", blurb: "friendlier numbers" },
  { value: "locked", label: "Locked in", blurb: "bigger, meaner numbers" },
];

/* ------------------------------------------------------------------ */
/* Question generation                                                 */
/* ------------------------------------------------------------------ */

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeQuestion(difficulty: Difficulty): Question {
  const hard = difficulty === "locked";
  const kind = randInt(0, 3);

  if (kind === 0) {
    // 2-digit addition
    const a = hard ? randInt(25, 99) : randInt(11, 49);
    const b = hard ? randInt(25, 99) : randInt(11, 49);
    return { prompt: `${a} + ${b}`, answer: a + b };
  }
  if (kind === 1) {
    // 2-digit subtraction, non-negative result
    let a = hard ? randInt(25, 99) : randInt(11, 49);
    let b = hard ? randInt(25, 99) : randInt(11, 49);
    if (b > a) [a, b] = [b, a];
    return { prompt: `${a} − ${b}`, answer: a - b };
  }
  if (kind === 2) {
    // 2-digit × 1-digit; locked-in sometimes serves a small 2×2
    if (hard && Math.random() < 0.25) {
      const a = randInt(11, 25);
      const b = randInt(11, 19);
      return { prompt: `${a} × ${b}`, answer: a * b };
    }
    const a = hard ? randInt(12, 99) : randInt(11, 29);
    const b = hard ? randInt(3, 9) : randInt(2, 6);
    return { prompt: `${a} × ${b}`, answer: a * b };
  }
  // clean division: build it from divisor × quotient
  const divisor = hard ? randInt(3, 12) : randInt(2, 9);
  const quotient = hard ? randInt(4, 19) : randInt(2, 9);
  return { prompt: `${divisor * quotient} ÷ ${divisor}`, answer: quotient };
}

/* ------------------------------------------------------------------ */
/* Personal best storage                                               */
/* ------------------------------------------------------------------ */

function readBests(): Bests {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return { chill: 0, locked: 0 };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "number") {
      // legacy plain-number format
      return { chill: parsed, locked: parsed };
    }
    const obj = parsed as Partial<Record<Difficulty, unknown>>;
    return {
      chill: typeof obj.chill === "number" ? obj.chill : 0,
      locked: typeof obj.locked === "number" ? obj.locked : 0,
    };
  } catch {
    return { chill: 0, locked: 0 };
  }
}

/* ------------------------------------------------------------------ */
/* Confetti (pure CSS, only rendered on a new personal best)           */
/* ------------------------------------------------------------------ */

const CONFETTI_COLORS = ["#8451ec", "#b79bfb", "#d3c2fe", "#f59e0b", "#34d399"];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.3 + Math.random() * 0.9,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
        drift: -50 + Math.random() * 100,
      })),
    []
  );
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
    >
      <style>{`@keyframes me2ib-confetti-fall {
        0% { transform: translate3d(0, -12px, 0) rotate(0deg); opacity: 1; }
        100% { transform: translate3d(var(--drift), 340px, 0) rotate(540deg); opacity: 0; }
      }`}</style>
      {pieces.map((p, i) => (
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
/* The game                                                            */
/* ------------------------------------------------------------------ */

function MathSprint() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [difficulty, setDifficulty] = useState<Difficulty>("chill");
  const [question, setQuestion] = useState<Question | null>(null);
  const [value, setValue] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [bests, setBests] = useState<Bests>({ chill: 0, locked: 0 });
  const [newBest, setNewBest] = useState(false);
  const [lastResult, setLastResult] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const endAtRef = useRef(0);

  // localStorage is browser-only — read after mount.
  useEffect(() => {
    setBests(readBests());
  }, []);

  // Countdown while running.
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      const left = Math.max(0, (endAtRef.current - Date.now()) / 1000);
      setTimeLeft(left);
      if (left <= 0) setPhase("done");
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  // Save personal best when a round ends.
  useEffect(() => {
    if (phase !== "done") return;
    const prev = readBests();
    if (score > prev[difficulty]) {
      const next = { ...prev, [difficulty]: score };
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable — best just won't persist
      }
      setBests(next);
      setNewBest(prev[difficulty] > 0); // celebrate beating a real previous best
    }
  }, [phase, score, difficulty]);

  function start() {
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setAnswered(0);
    setNewBest(false);
    setLastResult(null);
    setQuestion(makeQuestion(difficulty));
    setValue("");
    endAtRef.current = Date.now() + ROUND_SECONDS * 1000;
    setTimeLeft(ROUND_SECONDS);
    setPhase("running");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== "running" || !question) return;
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "-") return;

    const ok = Number(trimmed) === question.answer;
    setAnswered((a) => a + 1);
    if (ok) {
      const nextStreak = streak + 1;
      setScore((s) => s + 1);
      setStreak(nextStreak);
      if (nextStreak > bestStreak) setBestStreak(nextStreak);
      setLastResult({ ok: true, text: `${question.prompt} = ${question.answer}` });
    } else {
      setStreak(0);
      setLastResult({ ok: false, text: `${question.prompt} = ${question.answer}` });
    }
    setQuestion(makeQuestion(difficulty));
    setValue("");
  }

  const running = phase === "running";
  const timeFraction = timeLeft / ROUND_SECONDS;
  const best = bests[difficulty];

  return (
    <Card className="relative p-5 sm:p-6">
      {phase === "done" && newBest && <Confetti />}

      {/* Difficulty toggle (locked while a round is live) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-brand-200 bg-white p-0.5">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              type="button"
              disabled={running}
              onClick={() => setDifficulty(d.value)}
              title={d.blurb}
              className={cn(
                "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed",
                difficulty === d.value
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-zinc-500 hover:text-brand-700"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Trophy className="h-3.5 w-3.5 text-brand-400" />
          Personal best ({difficulty === "chill" ? "Chill" : "Locked in"}):{" "}
          <span className="font-semibold text-brand-900">{best}</span>
        </p>
      </div>

      {/* Countdown bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-brand-100">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-100 ease-linear",
            running && timeLeft <= 10 ? "bg-rose-400" : "bg-brand-500"
          )}
          style={{ width: `${(running ? timeFraction : 1) * 100}%` }}
        />
      </div>

      {phase === "idle" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="rounded-2xl bg-brand-100 p-3 text-brand-600">
            <Dumbbell className="h-6 w-6" />
          </div>
          <p className="max-w-sm text-sm text-zinc-500">
            60 seconds of +, −, ×, ÷. Type the answer, hit Enter, next one
            appears instantly. Wrong answers cost you the streak, not the
            clock.
          </p>
          <Button onClick={start} className="mt-1">
            <Play className="h-4 w-4" />
            Start the sprint
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
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-brand-600">
              {Math.ceil(timeLeft)}s
            </span>
          </div>

          <p className="mt-6 text-center text-4xl font-semibold tracking-tight text-brand-900 tabular-nums">
            {question.prompt}
          </p>

          <form onSubmit={submit} className="mx-auto mt-5 max-w-[11rem]">
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^\d-]/g, ""))}
              inputMode="numeric"
              autoComplete="off"
              aria-label="Your answer"
              placeholder="= ?"
              className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-center text-xl font-semibold text-brand-900 tabular-nums placeholder:text-zinc-300 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </form>

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
          <Button onClick={start} className="mt-1">
            <RotateCcw className="h-4 w-4" />
            Run it back
          </Button>
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
