"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { INDUSTRIES } from "@/lib/constants";
import type { Opportunity } from "@/lib/types";

export type ActionResult = { error?: string; ok?: boolean };

/** One raw item from the AI opportunity scan — every field is untrusted. */
export type ScannedOpportunityInput = {
  title?: unknown;
  company?: unknown;
  industry?: unknown;
  location?: unknown;
  link?: unknown;
  source?: unknown;
  deadline?: unknown;
  notes?: unknown;
};

export type ScanImportResult = {
  error?: string;
  ok?: boolean;
  /** Rows actually inserted. */
  added?: number;
  /** Rows skipped because they were already on the board. */
  skipped?: number;
};

const OPPORTUNITY_STATUS_VALUES = [
  "new",
  "saved",
  "added_to_tracker",
  "dismissed",
] as const;

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

function revalidate() {
  revalidatePath("/dashboard/opportunities");
  revalidatePath("/dashboard/applications");
  revalidatePath("/dashboard");
}

export async function upsertOpportunity(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const title = str(formData, "title");
  if (!title) return { error: "Title is required." };

  const status = str(formData, "status") ?? "new";
  if (!OPPORTUNITY_STATUS_VALUES.includes(status as (typeof OPPORTUNITY_STATUS_VALUES)[number])) {
    return { error: "Invalid status." };
  }

  const payload = {
    title,
    company: str(formData, "company"),
    industry: str(formData, "industry"),
    location: str(formData, "location"),
    link: str(formData, "link"),
    source: str(formData, "source"),
    deadline: str(formData, "deadline"),
    notes: str(formData, "notes"),
    status,
  };

  const id = str(formData, "id");
  const { error } = id
    ? await supabase
        .from("opportunities")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
    : await supabase
        .from("opportunities")
        .insert({ ...payload, user_id: user.id });

  if (error) return { error: error.message };

  revalidate();
  return { ok: true };
}

export async function deleteOpportunity(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { error } = await supabase
    .from("opportunities")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidate();
  return { ok: true };
}

export async function setOpportunityStatus(
  id: string,
  status: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  if (!OPPORTUNITY_STATUS_VALUES.includes(status as (typeof OPPORTUNITY_STATUS_VALUES)[number])) {
    return { error: "Invalid status." };
  }

  const { error } = await supabase
    .from("opportunities")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidate();
  return { ok: true };
}

/**
 * Copies an opportunity into the applications tracker as a fresh
 * "not started" application, then marks the opportunity added_to_tracker.
 */
export async function addToTracker(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data, error: fetchError } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !data) return { error: "Opportunity not found." };
  const opportunity = data as Opportunity;

  // Idempotent: already in the tracker (e.g. a double-click) — don't insert
  // a second application.
  if (opportunity.status === "added_to_tracker") return { ok: true };

  const notes =
    [
      opportunity.notes,
      opportunity.source ? `Found via: ${opportunity.source}` : null,
    ]
      .filter(Boolean)
      .join("\n\n") || null;

  const { error: insertError } = await supabase.from("applications").insert({
    user_id: user.id,
    company: opportunity.company ?? opportunity.title,
    position: opportunity.title,
    // Only set industry when known — otherwise let the DB default apply.
    ...(opportunity.industry ? { industry: opportunity.industry } : {}),
    location: opportunity.location,
    posting_link: opportunity.link,
    deadline: opportunity.deadline,
    status: "not_started",
    notes,
  });

  if (insertError) return { error: insertError.message };

  const { error: updateError } = await supabase
    .from("opportunities")
    .update({ status: "added_to_tracker" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) return { error: updateError.message };

  revalidate();
  return { ok: true };
}

const INDUSTRY_VALUES = new Set<string>(INDUSTRIES.map((i) => i.value));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/**
 * Bulk-inserts AI scan results onto the board. Every field is
 * whitelist-mapped (the items are model output), and anything already on
 * the board — same link, or same title + company — is skipped.
 */
export async function addScannedOpportunities(
  items: ScannedOpportunityInput[]
): Promise<ScanImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Nothing to add." };
  }

  const rows = items.slice(0, 15).flatMap((item) => {
    const title = cleanStr(item?.title);
    if (!title) return [];
    const industry = cleanStr(item?.industry)?.toLowerCase() ?? null;
    const deadline = cleanStr(item?.deadline);
    return [
      {
        title,
        company: cleanStr(item?.company),
        industry: industry && INDUSTRY_VALUES.has(industry) ? industry : null,
        location: cleanStr(item?.location),
        link: cleanStr(item?.link),
        source: cleanStr(item?.source),
        deadline: deadline && DATE_RE.test(deadline) ? deadline : null,
        notes: cleanStr(item?.notes),
      },
    ];
  });

  if (rows.length === 0) {
    return { error: "No valid opportunities in the scan results." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("opportunities")
    .select("title, company, link")
    .eq("user_id", user.id);

  if (fetchError) return { error: fetchError.message };

  const seenLinks = new Set<string>();
  const seenTitleCompany = new Set<string>();
  for (const row of existing ?? []) {
    if (row.link) seenLinks.add(row.link.toLowerCase());
    seenTitleCompany.add(
      `${(row.title ?? "").toLowerCase()}|${(row.company ?? "").toLowerCase()}`
    );
  }

  const fresh: typeof rows = [];
  for (const row of rows) {
    const linkKey = row.link?.toLowerCase();
    const tcKey = `${row.title.toLowerCase()}|${(row.company ?? "").toLowerCase()}`;
    if ((linkKey && seenLinks.has(linkKey)) || seenTitleCompany.has(tcKey)) {
      continue;
    }
    // Register keys so duplicates within the batch are skipped too.
    if (linkKey) seenLinks.add(linkKey);
    seenTitleCompany.add(tcKey);
    fresh.push(row);
  }

  const skipped = rows.length - fresh.length;
  if (fresh.length === 0) return { ok: true, added: 0, skipped };

  const { error } = await supabase
    .from("opportunities")
    .insert(fresh.map((r) => ({ ...r, user_id: user.id, status: "new" })));

  if (error) return { error: error.message };

  revalidate();
  return { ok: true, added: fresh.length, skipped };
}
