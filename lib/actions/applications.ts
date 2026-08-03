"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  APPLICATION_OUTCOMES,
  APPLICATION_PROGRESS_STAGES,
} from "@/lib/constants";

export type ActionResult = { error?: string; ok?: boolean };

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

function revalidate() {
  revalidatePath("/dashboard/applications");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard");
}

export async function upsertApplication(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const company = str(formData, "company");
  if (!company) return { error: "Company is required." };

  const status = str(formData, "status") ?? "not_started";
  if (!APPLICATION_PROGRESS_STAGES.some((stage) => stage.value === status)) {
    return { error: "Choose a valid application progress stage." };
  }
  const outcome = str(formData, "outcome") ?? "waiting";
  if (!APPLICATION_OUTCOMES.some((item) => item.value === outcome)) {
    return { error: "Choose a valid application outcome." };
  }

  const referralContactId = str(formData, "referral_contact_id");
  if (referralContactId) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("id", referralContactId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!contact) return { error: "Invalid referral contact." };
  }

  const payload = {
    company,
    position: str(formData, "position"),
    industry: str(formData, "industry") ?? "finance",
    sector: str(formData, "sector"),
    tier: str(formData, "tier"),
    location: str(formData, "location"),
    work_type: str(formData, "work_type"),
    employment_type: str(formData, "employment_type") ?? "internship",
    season: str(formData, "season"),
    hours_per_week: str(formData, "hours_per_week"),
    pay: str(formData, "pay"),
    status,
    outcome,
    priority: str(formData, "priority") ?? "target",
    deadline: str(formData, "deadline"),
    date_applied: str(formData, "date_applied"),
    application_link: str(formData, "application_link"),
    posting_link: str(formData, "posting_link"),
    referral_contact_id: referralContactId,
    networked: formData.get("networked") === "on",
    resume_status: str(formData, "resume_status") ?? "not_started",
    cover_letter_status: str(formData, "cover_letter_status") ?? "not_required",
    materials_needed: str(formData, "materials_needed"),
    missing_items: str(formData, "missing_items"),
    interview_notes: str(formData, "interview_notes"),
    open_questions: str(formData, "open_questions"),
    next_step: str(formData, "next_step"),
    next_step_date: str(formData, "next_step_date"),
    notes: str(formData, "notes"),
  };

  const id = str(formData, "id");
  const { error } = id
    ? await supabase
        .from("applications")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
    : await supabase
        .from("applications")
        .insert({ ...payload, user_id: user.id });

  if (error) return { error: error.message };

  revalidate();
  return { ok: true };
}

export async function deleteApplication(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidate();
  return { ok: true };
}

export async function setApplicationStatus(
  id: string,
  status: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };
  if (!APPLICATION_PROGRESS_STAGES.some((stage) => stage.value === status)) {
    return { error: "Choose a valid application progress stage." };
  }

  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidate();
  return { ok: true };
}

export async function setApplicationOutcome(
  id: string,
  outcome: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };
  if (!APPLICATION_OUTCOMES.some((item) => item.value === outcome)) {
    return { error: "Choose a valid application outcome." };
  }

  const { error } = await supabase
    .from("applications")
    .update({ outcome })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidate();
  return { ok: true };
}
