"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string; ok?: boolean };
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

function ownedContactPhotoPath(
  value: string | null,
  userId: string
): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const marker = "/storage/v1/object/public/avatars/";
    const index = url.pathname.indexOf(marker);
    if (url.protocol !== "https:" || index < 0) return null;
    const path = decodeURIComponent(url.pathname.slice(index + marker.length));
    const prefix = `${userId}/contacts/`;
    if (!path.startsWith(prefix)) return null;
    const filename = path.slice(prefix.length);
    // Deterministic linkedin-* objects are the importer cache and may still be
    // referenced by a warm route response. Only unique manual uploads are
    // eligible for action-time cleanup.
    return /^manual-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      filename
    )
      ? path
      : null;
  } catch {
    return null;
  }
}

async function removePhotoWhenUnreferenced(
  supabase: SupabaseClient,
  userId: string,
  oldUrl: string | null,
  currentUrl: string | null
): Promise<void> {
  const oldPath = ownedContactPhotoPath(oldUrl, userId);
  if (!oldPath || oldPath === ownedContactPhotoPath(currentUrl, userId)) return;

  const { data, error } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", userId)
    .like("photo_url", `%${oldPath}%`)
    .limit(1);
  if (error) {
    console.error("Could not check contact photo references:", error.message);
    return;
  }
  if ((data ?? []).length) return;
  const { error: removeError } = await supabase.storage
    .from("avatars")
    .remove([oldPath]);
  if (removeError) {
    console.error("Could not remove unused contact photo:", removeError.message);
  }
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
  let oldPhotoUrl: string | null = null;
  if (id) {
    const { data: existing, error: existingError } = await supabase
      .from("contacts")
      .select("photo_url")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingError) return { error: existingError.message };
    oldPhotoUrl = existing?.photo_url ?? null;
  }
  const { error } = id
    ? await supabase
        .from("contacts")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
    : await supabase.from("contacts").insert({ ...payload, user_id: user.id });

  if (error) return { error: error.message };
  if (id) {
    await removePhotoWhenUnreferenced(
      supabase,
      user.id,
      oldPhotoUrl,
      payload.photo_url
    );
  }

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

  const { data: existing, error: existingError } = await supabase
    .from("contacts")
    .select("photo_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingError) return { error: existingError.message };

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  await removePhotoWhenUnreferenced(
    supabase,
    user.id,
    existing?.photo_url ?? null,
    null
  );

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
