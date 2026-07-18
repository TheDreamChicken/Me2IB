// Math Gym question generators. Pure functions, no React — every question is
// procedurally built from templates + randomized values, so nothing repeats.
//
// CRITICAL INVARIANT: every template is constructed BACKWARDS from a clean
// integer answer (or exact whole percent) — pick the answer first, derive the
// displayed inputs — so no question ever has a decimal answer.

export type Difficulty = "chill" | "locked";
export type GymMode = "drills" | "bignum" | "word" | "tables";

export type TableData = {
  /** Header cells; the first one labels the row-name column. */
  columns: string[];
  /** Values are pre-formatted strings (thousands separators included). */
  rows: { label: string; values: string[] }[];
};

export type GymQuestion = {
  prompt: string;
  kind: "numeric" | "text";
  /** number for numeric questions, letter string for text questions. */
  answer: number | string;
  /** Display form of the answer, for feedback lines ("$600,000", "25%", "C"). */
  answerText: string;
  /** Small hint shown under the input ("answer in %, whole number"). */
  note?: string;
  /** Compact worked solution for the See-answer review (word/tables only). */
  solution?: string;
  /** Tables mode only: the exhibit to render above the input. */
  table?: TableData;
};

export const MODES: {
  value: GymMode;
  label: string;
  blurb: string;
  seconds: number;
  idle: string;
}[] = [
  {
    value: "drills",
    label: "Drills",
    blurb: "raw speed",
    seconds: 60,
    idle: "60 seconds of +, −, ×, ÷. Type the answer, hit Enter, next one appears instantly. Wrong answers cost you the streak, not the clock.",
  },
  {
    value: "bignum",
    label: "Big numbers",
    blurb: "read big numbers without blinking",
    seconds: 90,
    idle: "90 seconds of the same arithmetic, but everything's in the thousands and millions. Read the commas calmly — and shortcuts like 2.4m or 350k work in the answer box.",
  },
  {
    value: "word",
    label: "Word problems",
    blurb: "casing math in sentences",
    seconds: 120,
    idle: "120 seconds of one-line case math: growth, margins, breakevens, market sizes. Every answer is a clean whole number — no decimals, ever.",
  },
  {
    value: "tables",
    label: "Tables",
    blurb: "pull the number out of the exhibit",
    seconds: 150,
    idle: "150 seconds of exhibit reading: a fresh mini table every question, consulting-style. Find the right cells, do the math, type the number.",
  },
];

export const DIFFICULTIES: { value: Difficulty; label: string; blurb: string }[] = [
  { value: "chill", label: "Chill", blurb: "friendlier numbers" },
  { value: "locked", label: "Locked in", blurb: "bigger, meaner numbers" },
];

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 2400000 -> "2,400,000" */
export function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function money(n: number): string {
  return `$${fmt(n)}`;
}

/** Compact suffix form for prompts: 2,400,000 -> "2.4M"; 350,000 -> "350k". */
function fmtCompact(n: number): string {
  if (n % 100_000 === 0 && n >= 1_000_000) return `${n / 1_000_000}M`;
  if (n % 1_000 === 0) return `${n / 1_000}k`;
  return fmt(n);
}

const MONEY_NOTE = "answer in $ — shortcuts work: 2.4m, 350k";

const COMPANIES = [
  "Blorbo Industries",
  "Cardinal Coffee",
  "Maple & Main",
  "Otter Outfitters",
  "Pigeon Logistics",
  "Sundial Software",
  "Copper Kettle Co.",
  "Nimbus Analytics",
  "Bramble & Birch",
  "Wobble Works",
  "Juniper Junction",
  "Tundra Threads",
] as const;

/* ------------------------------------------------------------------ */
/* Answer parsing & checking                                           */
/* ------------------------------------------------------------------ */

/**
 * Parses a typed numeric answer. Accepts commas, spaces, $ signs, and
 * k/m/b suffixes: "2400000", "2,400,000", "2.4m", "2400k", "$2,400,000"
 * all parse to 2400000. Returns null if unparseable.
 */
export function parseAnswerInput(raw: string): number | null {
  let s = raw.trim().toLowerCase().replace(/[$,\s]/g, "");
  if (!s) return null;
  let mult = 1;
  const last = s[s.length - 1];
  if (last === "k") {
    mult = 1_000;
    s = s.slice(0, -1);
  } else if (last === "m") {
    mult = 1_000_000;
    s = s.slice(0, -1);
  } else if (last === "b") {
    mult = 1_000_000_000;
    s = s.slice(0, -1);
  }
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n * mult;
}

export function isCorrect(q: GymQuestion, raw: string): boolean {
  if (q.kind === "text") {
    return raw.trim().toLowerCase() === String(q.answer).toLowerCase();
  }
  const parsed = parseAnswerInput(raw);
  if (parsed === null) return false;
  const ans = q.answer as number;
  // Answers are exact integers; the tolerance only absorbs float noise from
  // suffix parsing (e.g. 2.4 × 1e6). Wrong integers differ by ≥ 1.
  return Math.abs(parsed - ans) < Math.max(1e-6, Math.abs(ans) * 1e-9);
}

/* ------------------------------------------------------------------ */
/* Mode 1: Drills — the classic raw-arithmetic sprint                  */
/* ------------------------------------------------------------------ */

export function makeDrillQuestion(difficulty: Difficulty): GymQuestion {
  const hard = difficulty === "locked";
  const kind = randInt(0, 3);
  const q = (prompt: string, answer: number): GymQuestion => ({
    prompt,
    answer,
    kind: "numeric",
    answerText: String(answer),
  });

  if (kind === 0) {
    // 2-digit addition
    const a = hard ? randInt(25, 99) : randInt(11, 49);
    const b = hard ? randInt(25, 99) : randInt(11, 49);
    return q(`${a} + ${b}`, a + b);
  }
  if (kind === 1) {
    // 2-digit subtraction, non-negative result
    let a = hard ? randInt(25, 99) : randInt(11, 49);
    let b = hard ? randInt(25, 99) : randInt(11, 49);
    if (b > a) [a, b] = [b, a];
    return q(`${a} − ${b}`, a - b);
  }
  if (kind === 2) {
    // 2-digit × 1-digit; locked-in sometimes serves a small 2×2
    if (hard && Math.random() < 0.25) {
      const a = randInt(11, 25);
      const b = randInt(11, 19);
      return q(`${a} × ${b}`, a * b);
    }
    const a = hard ? randInt(12, 99) : randInt(11, 29);
    const b = hard ? randInt(3, 9) : randInt(2, 6);
    return q(`${a} × ${b}`, a * b);
  }
  // clean division: built from divisor × quotient
  const divisor = hard ? randInt(3, 12) : randInt(2, 9);
  const quotient = hard ? randInt(4, 19) : randInt(2, 9);
  return q(`${divisor * quotient} ÷ ${divisor}`, quotient);
}

/* ------------------------------------------------------------------ */
/* Mode 2: Big numbers — same arithmetic, thousands & millions         */
/* ------------------------------------------------------------------ */

export function makeBigNumberQuestion(difficulty: Difficulty): GymQuestion {
  const hard = difficulty === "locked";
  const kind = randInt(0, 3);
  const q = (prompt: string, answer: number): GymQuestion => ({
    prompt,
    answer,
    kind: "numeric",
    answerText: fmt(answer),
  });

  if (kind === 0) {
    // addition: chill 120k–950k in 10k steps; locked 120k–9.5M in 1k steps
    const a = hard ? randInt(120, 9500) * 1_000 : randInt(12, 95) * 10_000;
    const b = hard ? randInt(120, 9500) * 1_000 : randInt(12, 95) * 10_000;
    return q(`${fmt(a)} + ${fmt(b)}`, a + b);
  }
  if (kind === 1) {
    // subtraction, non-negative
    let a = hard ? randInt(120, 9500) * 1_000 : randInt(12, 95) * 10_000;
    let b = hard ? randInt(120, 9500) * 1_000 : randInt(12, 95) * 10_000;
    if (b > a) [a, b] = [b, a];
    return q(`${fmt(a)} − ${fmt(b)}`, a - b);
  }
  if (kind === 2) {
    if (Math.random() < 0.5) {
      // compact form: "1.2M × 4"
      const a = (hard ? randInt(11, 95) : randInt(11, 40)) * 100_000;
      const b = hard ? randInt(3, 7) : randInt(2, 4);
      return q(`${fmtCompact(a)} × ${b}`, a * b);
    }
    const a = hard ? randInt(12, 95) * 10_000 : randInt(2, 9) * 100_000;
    const b = hard ? randInt(3, 9) : randInt(2, 6);
    return q(`${fmt(a)} × ${b}`, a * b);
  }
  // clean division, built backwards from quotient × divisor
  const divisor = hard ? randInt(3, 9) : randInt(2, 6);
  const quotient = hard ? randInt(12, 95) * 1_000 : randInt(2, 9) * 10_000;
  return q(`${fmt(divisor * quotient)} ÷ ${divisor}`, quotient);
}

/* ------------------------------------------------------------------ */
/* Mode 3: Word problems — one-line casing math                        */
/* ------------------------------------------------------------------ */

export const WORD_FAMILIES = [
  "growth",
  "percentOf",
  "margin",
  "breakeven",
  "market",
  "perUnit",
] as const;
export type WordFamily = (typeof WORD_FAMILIES)[number];

export function makeWordQuestion(
  difficulty: Difficulty,
  family: WordFamily = pick(WORD_FAMILIES)
): GymQuestion {
  const hard = difficulty === "locked";
  const company = pick(COMPANIES);

  if (family === "growth") {
    // Pick growth % and a base divisible by 100 → next-year revenue is exact.
    const g = hard ? pick([5, 15, 30, 35, 40, 45, 60, 75]) : pick([10, 20, 25, 50, 100]);
    const base = hard ? randInt(120, 980) * 1_000 : randInt(2, 9) * 100_000;
    const answer = (base / 100) * (100 + g);
    return {
      prompt: `${company}'s revenue was ${money(base)} in 2024 and grows ${g}% — what's 2025 revenue?`,
      kind: "numeric",
      answer,
      answerText: money(answer),
      note: MONEY_NOTE,
      solution: `2024 revenue ${money(base)} × (1 + ${g}%) = ${money(answer)}`,
    };
  }

  if (family === "percentOf") {
    const p = hard ? pick([4, 6, 8, 12, 15, 35, 45, 65]) : pick([5, 10, 20, 25, 50]);
    const base = hard ? randInt(120, 980) * 10_000 : randInt(2, 9) * 100_000;
    const answer = (base / 100) * p;
    return {
      prompt: `What's ${p}% of ${money(base)}?`,
      kind: "numeric",
      answer,
      answerText: money(answer),
      note: MONEY_NOTE,
      solution: `${money(base)} × ${p}% = ${money(base)} ÷ 100 × ${p} = ${money(answer)}`,
    };
  }

  if (family === "margin") {
    // Pick the margin first, derive costs → margin is always a whole percent.
    const m = hard ? randInt(11, 69) : pick([20, 25, 30, 40, 50, 75]);
    const revenue = hard ? randInt(120, 980) * 10_000 : randInt(2, 9) * 100_000;
    const costs = (revenue / 100) * (100 - m);
    const profit = revenue - costs;
    return {
      prompt: `${company}: revenue ${money(revenue)}, costs ${money(costs)} — profit margin in %?`,
      kind: "numeric",
      answer: m,
      answerText: `${m}%`,
      note: "answer in %, whole number",
      solution: `Profit = ${money(revenue)} − ${money(costs)} = ${money(profit)}; margin = ${money(profit)} ÷ ${money(revenue)} = ${m}%`,
    };
  }

  if (family === "breakeven") {
    // Pick the unit count first, derive fixed costs → always divides cleanly.
    const perUnit = hard ? pick([12, 15, 24, 35, 45, 60, 80]) : pick([10, 20, 25, 40, 50]);
    const units = hard ? randInt(12, 96) * 100 : randInt(2, 9) * 1_000;
    const fixed = perUnit * units;
    return {
      prompt: `${company} has fixed costs of ${money(fixed)}; each unit earns ${money(perUnit)} of profit — units to break even?`,
      kind: "numeric",
      answer: units,
      answerText: `${fmt(units)} units`,
      note: "answer in units, whole number",
      solution: `Fixed costs ÷ profit per unit = ${money(fixed)} ÷ ${money(perUnit)} = ${fmt(units)} units`,
    };
  }

  if (family === "market") {
    // Population is a multiple of 100 → adopter count (and the product) exact.
    const people = hard ? randInt(2, 90) * 500_000 : pick([1, 2, 4, 5, 8, 10]) * 1_000_000;
    const adopt = hard ? pick([4, 6, 8, 12, 15, 30, 35]) : pick([5, 10, 20, 25, 50]);
    const spend = hard ? pick([12, 15, 18, 24, 36, 45, 60]) : pick([5, 10, 20, 30, 50, 100]);
    const adopters = (people / 100) * adopt;
    const answer = adopters * spend;
    return {
      prompt: `${fmt(people)} people × ${adopt}% adoption × $${spend}/year — market size in $?`,
      kind: "numeric",
      answer,
      answerText: money(answer),
      note: MONEY_NOTE,
      solution: `${fmt(people)} × ${adopt}% = ${fmt(adopters)} adopters; ${fmt(adopters)} × $${spend} = ${money(answer)}`,
    };
  }

  // perUnit: pick cost-per-unit first, derive the total → clean division.
  const per = hard ? randInt(12, 96) : pick([10, 20, 25, 40, 50, 60, 80, 120]);
  const units = hard ? randInt(3, 12) * 100 : randInt(2, 9) * 100;
  const total = per * units;
  return {
    prompt: `${company}'s total cost is ${money(total)} across ${fmt(units)} units — cost per unit in $?`,
    kind: "numeric",
    answer: per,
    answerText: `$${per}`,
    note: "answer in $ per unit, whole number",
    solution: `${money(total)} ÷ ${fmt(units)} units = $${per} per unit`,
  };
}

/* ------------------------------------------------------------------ */
/* Mode 4: Tables — consulting exhibits & mini income statements       */
/* ------------------------------------------------------------------ */

export const TABLE_FAMILIES = [
  "exhibit-growth",
  "exhibit-total",
  "exhibit-compare",
  "exhibit-unitprice",
  "income-grossprofit",
  "income-ebit",
  "income-ebitda",
  "income-grossmargin",
] as const;
export type TableFamily = (typeof TABLE_FAMILIES)[number];

type ExhibitSeg = { label: string; g: number; y23: number; y24: number };

/** 3 segments × 2 years; each segment's growth is a whole percent by construction. */
function genExhibit(hard: boolean): { segs: ExhibitSeg[]; table: TableData } {
  const pool = hard ? [-25, -10, 5, 12, 15, 30, 40, 60] : [10, 20, 25, 50];
  const segs = ["A", "B", "C"].map((label) => {
    const g = pick(pool);
    // multiple of 100 → year-2 value exact for any whole growth %
    const y23 = hard ? randInt(12, 96) * 50_000 : randInt(2, 9) * 100_000;
    return { label, g, y23, y24: (y23 / 100) * (100 + g) };
  });
  return {
    segs,
    table: {
      columns: ["Segment", "2023 rev ($)", "2024 rev ($)"],
      rows: segs.map((s) => ({ label: s.label, values: [fmt(s.y23), fmt(s.y24)] })),
    },
  };
}

function genUnitPrice(hard: boolean) {
  const rows = ["A", "B", "C"].map((label) => ({
    label,
    units: hard ? randInt(12, 96) * 500 : randInt(2, 9) * 1_000,
    price: hard ? pick([12, 15, 24, 35, 45, 60]) : pick([10, 20, 25, 50]),
  }));
  const table: TableData = {
    columns: ["Segment", "Units sold", "Price ($)"],
    rows: rows.map((r) => ({ label: r.label, values: [fmt(r.units), fmt(r.price)] })),
  };
  return { rows, table };
}

/** Mini income statement; gross margin is a whole percent by construction, EBIT > 0. */
function genIncome(hard: boolean) {
  const gm = hard ? randInt(23, 78) : pick([30, 40, 50, 60, 75]);
  const revenue = hard ? randInt(12, 96) * 50_000 : randInt(2, 9) * 100_000; // multiple of 100
  const cogs = (revenue / 100) * (100 - gm);
  const gp = revenue - cogs;
  // Opex lines are floored to a clean step and capped as fractions of gross
  // profit (max 40 + 15 + 12 = 67%), so EBIT is always positive.
  const step = hard ? 1_000 : 10_000;
  const slice = (pct: number) => Math.max(step, Math.floor((gp * pct) / 100 / step) * step);
  const sga = slice(randInt(20, 40));
  const rd = slice(randInt(5, 15));
  const da = slice(randInt(5, 12));
  const table: TableData = {
    columns: ["Line item", "FY2024 ($)"],
    rows: [
      { label: "Revenue", values: [fmt(revenue)] },
      { label: "COGS", values: [fmt(cogs)] },
      { label: "SG&A", values: [fmt(sga)] },
      { label: "R&D", values: [fmt(rd)] },
      { label: "D&A", values: [fmt(da)] },
    ],
  };
  return { gm, revenue, cogs, gp, sga, rd, da, table };
}

export function makeTableQuestion(
  difficulty: Difficulty,
  family: TableFamily = pick(TABLE_FAMILIES)
): GymQuestion {
  const hard = difficulty === "locked";

  if (family === "exhibit-growth") {
    const { segs, table } = genExhibit(hard);
    const seg = pick(segs);
    return {
      prompt: `Segment ${seg.label}'s 2024 revenue growth in %?`,
      kind: "numeric",
      answer: seg.g,
      answerText: `${seg.g}%`,
      note: hard
        ? "answer in %, whole number (negative if it shrank)"
        : "answer in %, whole number",
      solution: `(${fmt(seg.y24)} − ${fmt(seg.y23)}) ÷ ${fmt(seg.y23)} = ${seg.g}%`,
      table,
    };
  }

  if (family === "exhibit-total") {
    const { segs, table } = genExhibit(hard);
    const answer = segs.reduce((sum, s) => sum + s.y24, 0);
    return {
      prompt: "Total 2024 revenue in $?",
      kind: "numeric",
      answer,
      answerText: money(answer),
      note: MONEY_NOTE,
      solution: `${fmt(segs[0].y24)} + ${fmt(segs[1].y24)} + ${fmt(segs[2].y24)} = ${money(answer)}`,
      table,
    };
  }

  if (family === "exhibit-compare") {
    let ex = genExhibit(hard);
    let guard = 0;
    while (ex.segs[0].g === ex.segs[2].g && guard++ < 30) ex = genExhibit(hard);
    const answer = ex.segs[0].g > ex.segs[2].g ? "A" : "C";
    return {
      prompt: "Which is bigger: A's 2024 growth or C's? (type A or C)",
      kind: "text",
      answer,
      answerText: answer,
      solution: `A grew ${ex.segs[0].g}%, C grew ${ex.segs[2].g}% — ${answer} is bigger`,
      table: ex.table,
    };
  }

  if (family === "exhibit-unitprice") {
    const { rows, table } = genUnitPrice(hard);
    const seg = pick(rows);
    const answer = seg.units * seg.price;
    return {
      prompt: `Segment ${seg.label}'s revenue in $?`,
      kind: "numeric",
      answer,
      answerText: money(answer),
      note: MONEY_NOTE,
      solution: `${fmt(seg.units)} units × $${seg.price} = ${money(answer)}`,
      table,
    };
  }

  const inc = genIncome(hard);
  const gpLine = `Gross profit = revenue − COGS = ${money(inc.revenue)} − ${money(inc.cogs)} = ${money(inc.gp)}`;

  if (family === "income-grossprofit") {
    return {
      prompt: "Gross profit in $?",
      kind: "numeric",
      answer: inc.gp,
      answerText: money(inc.gp),
      note: MONEY_NOTE,
      solution: gpLine,
      table: inc.table,
    };
  }
  if (family === "income-ebit") {
    const answer = inc.gp - inc.sga - inc.rd - inc.da;
    return {
      prompt: "EBIT in $?",
      kind: "numeric",
      answer,
      answerText: money(answer),
      note: MONEY_NOTE,
      solution: `${gpLine}; EBIT = GP − SG&A − R&D − D&A = ${money(inc.gp)} − ${money(inc.sga)} − ${money(inc.rd)} − ${money(inc.da)} = ${money(answer)}`,
      table: inc.table,
    };
  }
  if (family === "income-ebitda") {
    const answer = inc.gp - inc.sga - inc.rd;
    return {
      prompt: "EBITDA in $?",
      kind: "numeric",
      answer,
      answerText: money(answer),
      note: MONEY_NOTE,
      solution: `${gpLine}; EBITDA = GP − SG&A − R&D = ${money(inc.gp)} − ${money(inc.sga)} − ${money(inc.rd)} = ${money(answer)}`,
      table: inc.table,
    };
  }
  // income-grossmargin
  return {
    prompt: "Gross margin in %?",
    kind: "numeric",
    answer: inc.gm,
    answerText: `${inc.gm}%`,
    note: "answer in %, whole number",
    solution: `${gpLine}; margin = ${money(inc.gp)} ÷ ${money(inc.revenue)} = ${inc.gm}%`,
    table: inc.table,
  };
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */

export function makeGymQuestion(mode: GymMode, difficulty: Difficulty): GymQuestion {
  if (mode === "drills") return makeDrillQuestion(difficulty);
  if (mode === "bignum") return makeBigNumberQuestion(difficulty);
  if (mode === "word") return makeWordQuestion(difficulty);
  return makeTableQuestion(difficulty);
}
