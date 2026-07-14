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

export async function updateProfile(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const gradMonth = num(formData, "grad_month");
  if (gradMonth !== null && (gradMonth < 1 || gradMonth > 12)) {
    return { error: "Graduation month must be between 1 and 12." };
  }

  const payload = {
    user_id: user.id,
    full_name: str(formData, "full_name"),
    school: str(formData, "school"),
    major: str(formData, "major"),
    minor: str(formData, "minor"),
    grad_month: gradMonth,
    grad_year: num(formData, "grad_year"),
    standing: str(formData, "standing"),
    gpa: str(formData, "gpa"),
    city: str(formData, "city"),
    phone: str(formData, "phone"),
    linkedin_url: str(formData, "linkedin_url"),
    target_industries: formData
      .getAll("target_industries")
      .map((v) => String(v).trim())
      .filter(Boolean),
    clubs: str(formData, "clubs"),
    professional_summary: str(formData, "professional_summary"),
    personal_interests: str(formData, "personal_interests"),
    fun_facts: str(formData, "fun_facts"),
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "user_id" });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/account");
  revalidatePath("/dashboard");
  return { ok: true };
}
