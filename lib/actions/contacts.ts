"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string; ok?: boolean };

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

export async function upsertContact(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const name = str(formData, "name");
  if (!name) return { error: "Name is required." };

  // Parse numbers defensively: empty string would coerce to 0 and junk to
  // NaN, violating the DB CHECK constraints.
  const strengthRaw = Number(str(formData, "connection_strength") ?? "2");
  const strength = Number.isFinite(strengthRaw)
    ? Math.min(5, Math.max(1, Math.floor(strengthRaw)))
    : 2;
  const cadenceRaw = Number(str(formData, "followup_interval_days") ?? "21");
  const cadence =
    Number.isFinite(cadenceRaw) && cadenceRaw >= 1 ? Math.floor(cadenceRaw) : 21;

  const payload = {
    name,
    company: str(formData, "company"),
    position: str(formData, "position"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    linkedin_url: str(formData, "linkedin_url"),
    photo_url: str(formData, "photo_url"),
    location: str(formData, "location"),
    industry: str(formData, "industry"),
    how_met: str(formData, "how_met"),
    connection_strength: strength,
    relationship: str(formData, "relationship"),
    shared_interests: str(formData, "shared_interests"),
    alma_mater: str(formData, "alma_mater"),
    notes: str(formData, "notes"),
    tags: (str(formData, "tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    last_contacted: str(formData, "last_contacted"),
    followup_interval_days: cadence,
    status: str(formData, "status") ?? "active",
  };

  const id = str(formData, "id");
  const { error } = id
    ? await supabase
        .from("contacts")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
    : await supabase.from("contacts").insert({ ...payload, user_id: user.id });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteContact(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function markContacted(
  id: string,
  localDate?: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  // Prefer the caller's local calendar date (the server's UTC day can be
  // wrong for evening users west of UTC); fall back to the UTC day.
  const today =
    localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate)
      ? localDate
      : new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("contacts")
    .update({ last_contacted: today, status: "active" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard");
  return { ok: true };
}
