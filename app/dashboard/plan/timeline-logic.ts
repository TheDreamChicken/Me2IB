// Deterministic, rule-based recruiting-timeline math for the Plan tab.
// Pure functions only — imported by both the client view and the server action.
//
// All date math uses a "month index" = year * 12 + (month - 1), so plain
// subtraction gives months apart.

import { INDUSTRIES, labelFor } from "@/lib/constants";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type Phase =
  | "explore"
  | "prepare"
  | "network"
  | "apps_open"
  | "interviews"
  | "offers";

export const PHASE_STEPS: { value: Phase; label: string }[] = [
  { value: "explore", label: "Explore" },
  { value: "prepare", label: "Prepare" },
  { value: "network", label: "Network hard" },
  { value: "apps_open", label: "Applications open" },
  { value: "interviews", label: "Interview season" },
  { value: "offers", label: "Offer stage" },
];

function idx(year: number, month1to12: number): number {
  return year * 12 + (month1to12 - 1);
}

function monthLabel(monthIdx: number): string {
  return `${MONTH_NAMES[((monthIdx % 12) + 12) % 12]} ${Math.floor(monthIdx / 12)}`;
}

/**
 * "Standard student (figure it out for me)": derive the actual standing from
 * how far away graduation is (assumes a 4-year track).
 */
export function deriveStanding(
  gradYear: number,
  gradMonth: number,
  now: Date = new Date()
): "freshman" | "sophomore" | "junior" | "senior" {
  const months =
    idx(gradYear, gradMonth) - idx(now.getFullYear(), now.getMonth() + 1);
  if (months > 36) return "freshman";
  if (months > 24) return "sophomore";
  if (months > 12) return "junior";
  return "senior";
}

export type TimelineInput = {
  gradYear: number;
  gradMonth: number; // 1-12
  standing: string | null;
  industry: string; // INDUSTRIES value
  contactsCount: number;
  applicationsCount: number;
  now?: Date;
};

export type Timeline = {
  monthsUntilGrad: number;
  targetSummerYear: number;
  resolvedStanding: string;
  phase: Phase;
  phaseIndex: number;
  headline: string; // the "You are HERE" statement
  cycleNote: string; // industry-specific timing explanation
  actions: string[]; // top 3 actions for the current phase
  appsOpenLabel: string;
  appsCloseLabel: string;
};

function techPrepFor(industry: string): string {
  if (industry === "finance")
    return "technical prep — accounting fundamentals, valuation (DCF, comps), and the classic interview guides";
  if (industry === "consulting")
    return "case interview practice — do live cases with a partner, not just reading frameworks";
  return "role-specific skills — portfolio pieces, projects, and tools that show up in job postings";
}

export function computeTimeline(input: TimelineInput): Timeline {
  const now = input.now ?? new Date();
  const nowIdx = idx(now.getFullYear(), now.getMonth() + 1);
  const gradIdx = idx(input.gradYear, input.gradMonth);
  const monthsUntilGrad = gradIdx - nowIdx;

  // Junior summer — the internship summer that feeds full-time offers.
  const targetSummerYear = input.gradYear - 1;
  const S = targetSummerYear;

  const resolvedStanding =
    !input.standing || input.standing === "standard"
      ? deriveStanding(input.gradYear, input.gradMonth, now)
      : input.standing;

  const industryLabel = labelFor(INDUSTRIES, input.industry);

  // Application windows per industry (month indices).
  let appsOpen: number;
  let appsClose: number;
  let interviewsEnd: number;
  let cycleNote: string;

  if (input.industry === "finance") {
    // Junior-summer IB recruiting opens ~18-24 months ahead:
    // apps open Jan–Jun of SOPHOMORE year (spring of grad_year - 2).
    appsOpen = idx(S - 1, 1);
    appsClose = idx(S - 1, 6);
    interviewsEnd = idx(S - 1, 10);
    cycleNote = `Finance recruits earlier than any other industry. Applications for summer ${S} internships open roughly ${monthLabel(appsOpen)}–${monthLabel(appsClose)} — that's sophomore spring, a full 18–24 months before the internship starts. Interviews (HireVues, first rounds, superdays) roll on from there through about ${monthLabel(interviewsEnd)}, and firms review on a rolling basis — early applicants win.`;
  } else if (input.industry === "consulting") {
    // Apps ~summer/fall of junior year for the next summer.
    appsOpen = idx(S - 1, 6);
    appsClose = idx(S - 1, 11);
    interviewsEnd = idx(S, 2);
    cycleNote = `Consulting applications for summer ${S} run roughly ${monthLabel(appsOpen)}–${monthLabel(appsClose)} — the summer before junior year through junior fall. Case interviews follow through about ${monthLabel(interviewsEnd)}. Less extreme than finance, but MBB deadlines are firm — know your school's exact dates.`;
  } else {
    // Other industries: fall/winter of junior-senior year, more just-in-time.
    appsOpen = idx(S - 1, 9);
    appsClose = idx(S, 2);
    interviewsEnd = idx(S, 4);
    cycleNote = `${industryLabel} recruiting is more just-in-time than finance or consulting: applications for summer ${S} mostly open ${monthLabel(appsOpen)}–${monthLabel(appsClose)} — fall and winter of junior year — with interviews through about ${monthLabel(interviewsEnd)}. Postings appear year-round, so checking regularly beats any single deadline.`;
  }

  // Classify "now" into a phase.
  let phase: Phase;
  if (nowIdx < appsOpen - 10) phase = "explore";
  else if (nowIdx < appsOpen - 4) phase = "prepare";
  else if (nowIdx < appsOpen) phase = "network";
  else if (nowIdx <= appsClose) phase = "apps_open";
  else if (nowIdx <= interviewsEnd) phase = "interviews";
  else phase = "offers";

  const monthsUntilOpen = appsOpen - nowIdx;
  const standingLabel =
    resolvedStanding.charAt(0).toUpperCase() + resolvedStanding.slice(1);

  let headline: string;
  if (monthsUntilGrad < 0) {
    phase = "offers";
    headline = `You've graduated — the summer ${S} internship cycle is behind you. The play now is full-time and off-cycle recruiting: smaller firms and boutiques hire year-round, and your network matters more than ever.`;
  } else {
    switch (phase) {
      case "explore":
        headline = `${standingLabel}, ${monthsUntilGrad} months from graduation — you're early, and that's a superpower. ${industryLabel} applications for summer ${S} don't open until ${monthLabel(appsOpen)} (${monthsUntilOpen} months away). Right now is for exploring, joining clubs, and building good habits.`;
        break;
      case "prepare":
        headline = `${standingLabel}, with ${industryLabel} applications for summer ${S} opening in about ${monthsUntilOpen} months (${monthLabel(appsOpen)}). You're in the prep window: resume, fundamentals, and your first coffee chats.`;
        break;
      case "network":
        headline = `${standingLabel} — you're ${monthsUntilOpen} month${monthsUntilOpen === 1 ? "" : "s"} from ${industryLabel} applications opening (${monthLabel(appsOpen)}). This is the networking sprint: the people you meet now become the referrals that get your application read.`;
        break;
      case "apps_open":
        headline = `${industryLabel} applications for summer ${S} internships are OPEN right now (they close around ${monthLabel(appsClose)}). Most firms review on a rolling basis, so every week you wait costs you.`;
        break;
      case "interviews":
        headline = `Application windows for summer ${S} have mostly closed — you're in interview season. First rounds and superdays are happening now, so prep is your full-time side job.`;
        break;
      case "offers":
        headline = `The summer ${S} ${industryLabel.toLowerCase()} cycle is wrapping up. If you have an offer — congratulations. If not, don't panic: off-cycle roles, boutiques, and full-time recruiting in senior fall are all real paths.`;
        break;
    }
  }

  // Top 3 actions, driven by phase + tracker counts.
  const base: Record<Phase, string[]> = {
    explore: [
      "Join one or two career-relevant clubs — the upperclassmen there have run this exact race and will share what worked.",
      "Do 2–3 low-stakes coffee chats to learn what the day-to-day actually looks like in your target industry.",
      "Draft a clean one-page resume and protect your GPA — it's the first screening filter everywhere.",
    ],
    prepare: [
      "Build a target list of 15–20 firms in your Applications tracker so nothing sneaks up on you.",
      `Start ${techPrepFor(input.industry)}.`,
      "Do one coffee chat per week and log every person in Contacts — consistency beats bursts.",
    ],
    network: [
      "Ramp to 2–3 coffee chats a week, prioritizing people at your target firms.",
      "Ask your warmest contacts for referrals — a referral is worth dozens of cold applications.",
      "Get your resume reviewed by someone in the industry and make your story interview-ready.",
    ],
    apps_open: [
      "Submit applications now — rolling review means early applicants get the interview slots.",
      "Pair every application with a referral or a recent coffee chat at that firm.",
      "Keep technicals sharp — first-round invites can land days after you submit.",
    ],
    interviews: [
      "Drill mock interviews daily — technicals for finance, live cases for consulting, behaviorals for everyone.",
      "Tighten your stories: why this industry, why this firm, and a challenge you overcame.",
      "Send thank-you notes within 24 hours and log every next step in your tracker.",
    ],
    offers: [
      "If you're holding an offer, evaluate it with people you trust — deadlines can be tight but extensions exist.",
      "No offer yet? Go off-cycle: boutiques and smaller firms hire year-round and love proactive outreach.",
      "Thank everyone who helped you and keep those contacts warm — your network compounds into next cycle.",
    ],
  };

  let actions = [...base[phase]];
  if (input.contactsCount === 0) {
    actions.unshift(
      "Networking basics first: add your first 5 contacts — alumni, club upperclassmen, family friends — and ask each for a 15-minute coffee chat."
    );
  } else if (input.applicationsCount === 0 && phase === "apps_open") {
    actions.unshift(
      "Applications are open and your tracker is empty — add your target firms today and submit your first application this week."
    );
  }
  actions = actions.slice(0, 3);

  return {
    monthsUntilGrad,
    targetSummerYear,
    resolvedStanding,
    phase,
    phaseIndex: PHASE_STEPS.findIndex((p) => p.value === phase),
    headline,
    cycleNote,
    actions,
    appsOpenLabel: monthLabel(appsOpen),
    appsCloseLabel: monthLabel(appsClose),
  };
}
