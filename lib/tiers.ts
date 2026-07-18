// Subscription tiers: "Still Cold" (free) → "Warming Up" → "In The Heat".
// Pure shared module — safe to import from server and client code.

export type TierId = "free" | "warming" | "heat";

export const TIER_ORDER: TierId[] = ["free", "warming", "heat"];

/** Features that are locked behind a paid tier. */
export type GatedFeature =
  | "practice" // the entire Practice section (guides, key terms, Math Gym)
  | "ai_import" // AI import/scan features (opportunity scanner)
  | "ai_outreach" // AI outreach drafts on contacts
  | "ai_plan" // AI-personalized recruiting plan
  | "ai_review" // AI resume / document review
  | "ai_chat"; // AI chat (coming soon)

export const FEATURE_MIN_TIER: Record<GatedFeature, TierId> = {
  practice: "warming",
  ai_import: "warming",
  ai_outreach: "heat",
  ai_plan: "heat",
  ai_review: "heat",
  ai_chat: "heat",
};

export const TIER_INFO: Record<
  TierId,
  {
    label: string;
    price: string;
    priceNote: string;
    tagline: string;
    badgeClass: string;
    features: string[];
  }
> = {
  free: {
    label: "Still Cold",
    price: "Free",
    priceNote: "forever",
    tagline: "Everything you need to start tracking the chaos.",
    badgeClass: "bg-sky-100 text-sky-700",
    features: [
      "Contacts with follow-up staleness tracking",
      "Application tracker, calendar & smart suggestions",
      "Documents storage, experience log & story bank",
      "Rules-based recruiting plan & opportunities board",
      "LinkedIn contact import",
      "Recruiting FAQ & resources",
    ],
  },
  warming: {
    label: "Warming Up",
    price: "$4/mo",
    priceNote: "billed monthly",
    tagline: "Add the full Practice section and AI-powered scanning.",
    badgeClass: "bg-amber-100 text-amber-700",
    features: [
      "Everything in Still Cold",
      "Full Practice section — guides, key terms & Math Gym",
      "AI opportunity scanner (web-search powered)",
    ],
  },
  heat: {
    label: "In The Heat",
    price: "$10/mo",
    priceNote: "billed monthly",
    tagline: "The full toolkit — every AI feature, no limits.",
    badgeClass: "bg-rose-100 text-rose-600",
    features: [
      "Everything in Warming Up",
      "AI resume & document review",
      "AI outreach drafts for any contact",
      "AI-personalized recruiting plan",
      "AI chat, the moment it ships",
    ],
  },
};

/** Map raw DB values (including iteration-1 legacy 'plus'/'pro') to a TierId. */
export function normalizeTier(raw: string | null | undefined): TierId {
  if (raw === "warming" || raw === "plus") return "warming";
  if (raw === "heat" || raw === "pro") return "heat";
  return "free";
}

export function tierAtLeast(tier: TierId, min: TierId): boolean {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(min);
}

export function hasFeature(tier: TierId, feature: GatedFeature): boolean {
  return tierAtLeast(tier, FEATURE_MIN_TIER[feature]);
}

/** The cheapest tier that unlocks a feature (for upgrade prompts). */
export function requiredTier(feature: GatedFeature): TierId {
  return FEATURE_MIN_TIER[feature];
}
