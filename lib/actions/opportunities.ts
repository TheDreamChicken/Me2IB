"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Opportunity } from "@/lib/types";

export type ActionResult = { error?: string; ok?: boolean };

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
