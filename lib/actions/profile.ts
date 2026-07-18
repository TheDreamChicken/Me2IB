"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TIER_INFO, TIER_ORDER, type TierId } from "@/lib/tiers";

export type ActionResult = { error?: string; ok?: boolean };

export async function setProfileAvatar(
  hasAvatar: boolean
): Promise<ActionResult & { avatarUrl?: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const path = `${user.id}/avatar`;
  let avatarUrl: string | null = null;
  if (hasAvatar) {
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
  } else {
    // Best effort: clearing the profile should still work if the object was
    // already missing.
    const { error } = await supabase.storage.from("avatars").remove([path]);
    if (error) console.error("Could not remove profile avatar:", error.message);
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(
      { user_id: user.id, avatar_url: avatarUrl },
      { onConflict: "user_id" }
    );
  if (error) return { error: error.message };

  revalidatePath("/dashboard/account");
  revalidatePath("/dashboard", "layout");
  return { ok: true, avatarUrl };
}

// Demo access codes — redeemed server-side only so they never ship to the client.
const ACCESS_CODES: Record<string, TierId> = {
  JPRYAN: "heat",
  JPN: "warming",
};

async function setTier(tier: TierId): Promise<ActionResult & { tier?: TierId }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, tier }, { onConflict: "user_id" });
  if (error) return { error: error.message };

  // "layout" so the sidebar tier subtext refreshes everywhere.
  revalidatePath("/dashboard", "layout");
  return { ok: true, tier };
}

/** Redeem a demo access code (e.g. from a promo) to switch tiers instantly. */
export async function redeemAccessCode(
  code: string
): Promise<ActionResult & { tier?: TierId; tierLabel?: string }> {
  const cleaned = code.trim().toUpperCase();
  if (!cleaned) return { error: "Type a code first." };
  const tier = ACCESS_CODES[cleaned];
  if (!tier) {
    return { error: "That code didn't match anything — double-check it?" };
  }
  const result = await setTier(tier);
  if (result.error) return result;
  return { ...result, tierLabel: TIER_INFO[tier].label };
}

/**
 * Demo checkout: real payments aren't hooked up yet, so "purchasing" a plan
 * (or downgrading) just records the tier on the profile. When Stripe lands,
 * this becomes the post-checkout webhook's job instead.
 */
export async function changeTier(tier: string): Promise<ActionResult> {
  if (!TIER_ORDER.includes(tier as TierId)) {
    return { error: "Unknown plan." };
  }
  return setTier(tier as TierId);
}

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

/** Repeated form fields (e.g. the majors/minors/certificates lists). */
function list(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map((v) => String(v).trim())
    .filter(Boolean);
}

/** One-item-per-line textareas: trim each line, drop empties. */
function bullets(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  if (v === null) return null;
  const cleaned = v
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
  return cleaned === "" ? null : cleaned;
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

  // GPA: store as X.XX on a 4.00 scale.
  const gpaRaw = str(formData, "gpa");
  let gpa: string | null = null;
  if (gpaRaw !== null) {
    const n = Number(gpaRaw);
    if (!Number.isFinite(n)) {
      return { error: "GPA should be a plain number, like 3.87." };
    }
    if (n < 0 || n > 4) {
      return {
        error:
          "GPA needs to be between 0.00 and 4.00 — double-check that one?",
      };
    }
    gpa = n.toFixed(2);
  }

  const majors = list(formData, "majors");
  const minors = list(formData, "minors");
  const certificates = list(formData, "certificates");

  const payload = {
    user_id: user.id,
    full_name: str(formData, "full_name"),
    school: str(formData, "school"),
    majors,
    minors,
    certificates,
    // Keep the legacy single columns in sync for anything still reading them.
    major: majors[0] ?? null,
    minor: minors[0] ?? null,
    grad_month: gradMonth,
    grad_year: num(formData, "grad_year"),
    standing: str(formData, "standing"),
    gpa,
    city: str(formData, "city"),
    phone: str(formData, "phone"),
    linkedin_url: str(formData, "linkedin_url"),
    target_industries: formData
      .getAll("target_industries")
      .map((v) => String(v).trim())
      .filter(Boolean),
    clubs: bullets(formData, "clubs"),
    professional_summary: str(formData, "professional_summary"),
    personal_interests: bullets(formData, "personal_interests"),
    fun_facts: bullets(formData, "fun_facts"),
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "user_id" });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/account");
  revalidatePath("/dashboard");
  return { ok: true };
}
