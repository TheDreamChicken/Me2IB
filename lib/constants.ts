// Shared vocabulary for industries, tiers, statuses, and labels.

export const INDUSTRIES = [
  { value: "finance", label: "Finance" },
  { value: "consulting", label: "Consulting" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
  { value: "tech", label: "Tech / Product" },
  { value: "data", label: "Data / Analytics" },
  { value: "real_estate", label: "Real Estate" },
  { value: "other", label: "Other" },
] as const;

// Tiers per industry (finance banks / consulting firms)
export const TIERS: Record<string, { value: string; label: string }[]> = {
  finance: [
    { value: "BB", label: "Bulge Bracket (GS, MS, JPM...)" },
    { value: "EB", label: "Elite Boutique (Evercore, Lazard, PJT...)" },
    { value: "MM", label: "Middle Market (Baird, HL, Jefferies...)" },
    { value: "boutique", label: "Boutique / Regional" },
    { value: "AM", label: "Asset Mgmt / Buy-side" },
    { value: "other", label: "Other" },
  ],
  consulting: [
    { value: "MBB", label: "MBB (McKinsey, Bain, BCG)" },
    { value: "T2", label: "Tier 2 (S&, OW, LEK, Kearney, RB)" },
    { value: "Big4", label: "Big 4 (Deloitte, EY, KPMG, PwC)" },
    { value: "boutique", label: "Boutique / Specialized" },
    { value: "other", label: "Other" },
  ],
};

// Coverage sectors / practice areas
export const SECTORS: Record<string, string[]> = {
  finance: [
    "M&A",
    "TMT",
    "Healthcare",
    "Industrials",
    "Consumer & Retail",
    "Energy",
    "FIG",
    "Real Estate",
    "Restructuring",
    "ECM / DCM",
    "Leveraged Finance",
    "Generalist",
  ],
  consulting: [
    "Strategy",
    "Operations",
    "Healthcare",
    "Industrials",
    "TMT",
    "Financial Services",
    "Consumer",
    "Public Sector",
    "Generalist",
  ],
};

export const APPLICATION_STATUSES = [
  { value: "not_started", label: "Not started", color: "bg-zinc-100 text-zinc-600" },
  { value: "in_progress", label: "In progress", color: "bg-amber-100 text-amber-700" },
  { value: "submitted", label: "Submitted", color: "bg-blue-100 text-blue-700" },
  { value: "online_assessment", label: "Online assessment", color: "bg-cyan-100 text-cyan-700" },
  { value: "phone_screen", label: "Phone screen", color: "bg-indigo-100 text-indigo-700" },
  { value: "first_round", label: "First round", color: "bg-violet-100 text-violet-700" },
  { value: "superday", label: "Superday / Final", color: "bg-purple-100 text-purple-700" },
  { value: "offer", label: "Offer 🎉", color: "bg-emerald-100 text-emerald-700" },
  { value: "rejected", label: "Rejected", color: "bg-rose-100 text-rose-600" },
  { value: "waitlisted", label: "Waitlisted", color: "bg-orange-100 text-orange-700" },
  { value: "withdrawn", label: "Withdrawn", color: "bg-zinc-100 text-zinc-500" },
] as const;

export const PRIORITIES = [
  { value: "dream", label: "Dream" },
  { value: "target", label: "Target" },
  { value: "safety", label: "Safety" },
] as const;

export const MATERIAL_STATUSES = [
  { value: "not_started", label: "Not started" },
  { value: "drafting", label: "Drafting" },
  { value: "tailored", label: "Tailored" },
  { value: "done", label: "Done" },
  { value: "submitted", label: "Submitted" },
  { value: "not_required", label: "Not required" },
  { value: "needed", label: "Needed" },
] as const;

export const EVENT_TYPES = [
  { value: "interview", label: "Interview", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "coffee_chat", label: "Coffee chat", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "networking", label: "Networking", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "info_session", label: "Info session", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { value: "deadline", label: "Deadline", color: "bg-rose-100 text-rose-600 border-rose-200" },
  { value: "meeting", label: "Meeting", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "followup", label: "Follow-up", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { value: "other", label: "Other", color: "bg-zinc-100 text-zinc-600 border-zinc-200" },
] as const;

export const CONNECTION_STRENGTHS = [
  { value: 1, label: "Just met" },
  { value: 2, label: "Acquaintance" },
  { value: 3, label: "Friendly" },
  { value: 4, label: "Strong" },
  { value: 5, label: "Advocate" },
] as const;

export const DOC_TYPES = [
  { value: "resume", label: "Resume" },
  { value: "cover_letter", label: "Cover letter" },
  { value: "transcript", label: "Transcript" },
  { value: "essay", label: "Essay / Short answer" },
  { value: "writing_sample", label: "Writing sample" },
  { value: "other", label: "Other" },
] as const;

export const STORY_CATEGORIES = [
  { value: "behavioral", label: "General behavioral" },
  { value: "leadership", label: "Leadership" },
  { value: "teamwork", label: "Teamwork" },
  { value: "challenge", label: "Challenge / Failure" },
  { value: "why_firm", label: "Why this firm" },
  { value: "why_industry", label: "Why this industry" },
  { value: "strengths_weaknesses", label: "Strengths & weaknesses" },
  { value: "technical", label: "Technical" },
  { value: "other", label: "Other" },
] as const;

export const ROLE_TYPES = [
  { value: "internship", label: "Internship" },
  { value: "job", label: "Job" },
  { value: "club", label: "Club / Org" },
  { value: "project", label: "Project" },
  { value: "research", label: "Research" },
  { value: "volunteer", label: "Volunteer" },
] as const;

export const STANDINGS = [
  { value: "freshman", label: "Freshman (1st year)" },
  { value: "sophomore", label: "Sophomore (2nd year)" },
  { value: "junior", label: "Junior (3rd year)" },
  { value: "senior", label: "Senior (4th year)" },
  { value: "masters", label: "Master's student" },
  { value: "standard", label: "Standard student (figure it out for me)" },
] as const;

export function labelFor(
  list: readonly { value: string; label: string }[],
  value: string | null | undefined
): string {
  if (!value) return "—";
  return list.find((i) => i.value === value)?.label ?? value;
}

export function statusColor(value: string | null | undefined): string {
  return (
    APPLICATION_STATUSES.find((s) => s.value === value)?.color ??
    "bg-zinc-100 text-zinc-600"
  );
}

// Company logo helper (favicon-based, no API key needed)
export function companyLogoUrl(company: string | null | undefined): string | null {
  if (!company) return null;
  const domainGuess = company
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
  if (!domainGuess) return null;
  return `https://www.google.com/s2/favicons?domain=${domainGuess}.com&sz=64`;
}
