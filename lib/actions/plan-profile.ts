"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  const industry = str(formData, "target_industry");

  // The "standard" standing option was retired. If it somehow arrives (stale
  // tab, old client), store it as unset — the timeline derives standing from
  // the grad date whenever it's null, so nothing goes stale.
  const standing = standingRaw === "standard" ? null : standingRaw;

  if (gradMonth !== null && (gradMonth < 1 || gradMonth > 12)) {
    return { error: "Graduation month must be between 1 and 12." };
  }

  // The Account page manages target_industries as a multi-select; this form
  // only picks the primary one. Merge instead of overwriting — and the chosen
  // industry MUST go first: the Plan form and the timeline both read
  // target_industries[0] as the primary industry.
  let targetIndustries: string[] | undefined;
  if (industry) {
    const { data: existing, error: readError } = await supabase
      .from("profiles")
      .select("target_industries")
      .eq("user_id", user.id)
      .maybeSingle();
    if (readError) return { error: readError.message };
    const current: string[] = existing?.target_industries ?? [];
    targetIndustries = [industry, ...current.filter((v) => v !== industry)];
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
      ...(targetIndustries ? { target_industries: targetIndustries } : {}),
    },
    { onConflict: "user_id" }
  );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/plan");
  revalidatePath("/dashboard");
  return { ok: true };
}
