"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deriveStanding } from "@/app/dashboard/plan/timeline-logic";

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
  let standing = str(formData, "standing");
  const industry = str(formData, "target_industry");

  if (gradMonth !== null && (gradMonth < 1 || gradMonth > 12)) {
    return { error: "Graduation month must be between 1 and 12." };
  }

  // "Standard student (figure it out for me)": derive the actual standing
  // from the graduation date (years until graduation -> class year).
  if (standing === "standard") {
    if (!gradYear || !gradMonth) {
      return {
        error:
          "Pick a graduation month and year so we can figure out your standing.",
      };
    }
    standing = deriveStanding(gradYear, gradMonth);
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
      target_industries: industry ? [industry] : [],
    },
    { onConflict: "user_id" }
  );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/plan");
  revalidatePath("/dashboard");
  return { ok: true };
}
