"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { INDUSTRIES } from "@/lib/constants";

export type ActionResult = { error?: string; ok?: boolean };

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

function num(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function savePlanProfile(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const school = str(formData, "school");
  const gradMonth = num(formData, "grad_month");
  const gradYear = num(formData, "grad_year");
  const standingRaw = str(formData, "standing");
  const submittedIndustries = formData
    .getAll("target_industries")
    .map((value) => String(value).trim())
    .filter((value) => INDUSTRIES.some((industry) => industry.value === value));
  // Keep stale tabs/backward compatibility working while the new form sends
  // the ordered target_industries fields.
  const legacyIndustry = str(formData, "target_industry");
  const targetIndustries = [
    ...submittedIndustries,
    ...(legacyIndustry ? [legacyIndustry] : []),
  ].filter(
    (value, index, all) =>
      INDUSTRIES.some((industry) => industry.value === value) &&
      all.indexOf(value) === index
  );

  // The "standard" standing option was retired. If it somehow arrives (stale
  // tab, old client), store it as unset — the timeline derives standing from
  // the grad date whenever it's null, so nothing goes stale.
  const standing = standingRaw === "standard" ? null : standingRaw;

  if (gradMonth !== null && (gradMonth < 1 || gradMonth > 12)) {
    return { error: "Graduation month must be between 1 and 12." };
  }

  // Profile rows are keyed by user_id (auto-created on signup); upsert keeps
  // this safe even if the trigger hasn't run. RLS + explicit user_id scope it.
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      school,
      grad_month: gradMonth,
      grad_year: gradYear,
      standing,
      target_industries: targetIndustries,
    },
    { onConflict: "user_id" }
  );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/plan");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function saveAiPlan(
  planMarkdown: string,
  meta: {
    target_industry?: string | null;
    grad_year?: number | null;
    grad_month?: number | null;
    standing?: string | null;
  }
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  // The model outputs ~48k chars max; the cap is just abuse protection since
  // server actions are reachable as plain POST endpoints.
  const markdown = String(planMarkdown ?? "")
    .trim()
    .slice(0, 100_000);
  if (!markdown) return { error: "The generated plan came back empty." };

  const clean = (v: string | null | undefined) => {
    const s = String(v ?? "").trim();
    return s === "" ? null : s;
  };
  const cleanInt = (v: number | null | undefined) =>
    typeof v === "number" && Number.isInteger(v) ? v : null;

  const row = {
    target_industry: clean(meta.target_industry),
    grad_year: cleanInt(meta.grad_year),
    grad_month: cleanInt(meta.grad_month),
    standing: clean(meta.standing),
    plan_markdown: markdown,
    generated_by: "ai",
  };

  // One plan per user, but NOT via upsert-onConflict: the unique index on
  // plans(user_id) is newer than some deployed databases, so select the
  // existing row (newest first, in case legacy duplicates exist) and update
  // it — else insert.
  const { data: existing, error: readError } = await supabase
    .from("plans")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) return { error: readError.message };

  const { error } = existing
    ? await supabase
        .from("plans")
        .update(row)
        .eq("id", existing.id)
        .eq("user_id", user.id)
    : await supabase.from("plans").insert({ ...row, user_id: user.id });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/plan");
  return { ok: true };
}
