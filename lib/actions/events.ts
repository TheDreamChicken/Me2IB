"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string; ok?: boolean };

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

function revalidate() {
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard");
}

export async function upsertEvent(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const title = str(formData, "title");
  if (!title) return { error: "Title is required." };

  const start_at = str(formData, "start_at");
  if (!start_at) return { error: "A date is required." };

  const allDayRaw = String(formData.get("all_day") ?? "");
  const payload = {
    title,
    description: str(formData, "description"),
    event_type: str(formData, "event_type") ?? "other",
    start_at,
    end_at: str(formData, "end_at"),
    all_day: allDayRaw === "on" || allDayRaw === "true",
    location: str(formData, "location"),
    contact_id: str(formData, "contact_id"),
    application_id: str(formData, "application_id"),
    source: str(formData, "source") ?? "manual",
  };

  // FK constraints don't go through RLS, so verify the caller actually owns
  // any linked contact/application before writing the reference.
  if (payload.contact_id) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("id", payload.contact_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!contact) return { error: "Invalid linked record." };
  }
  if (payload.application_id) {
    const { data: application } = await supabase
      .from("applications")
      .select("id")
      .eq("id", payload.application_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!application) return { error: "Invalid linked record." };
  }

  const id = str(formData, "id");
  const { error } = id
    ? await supabase
        .from("events")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
    : await supabase.from("events").insert({ ...payload, user_id: user.id });

  if (error) return { error: error.message };

  revalidate();
  return { ok: true };
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidate();
  return { ok: true };
}

export async function toggleEventComplete(
  id: string,
  completed: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { error } = await supabase
    .from("events")
    .update({ completed })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidate();
  return { ok: true };
}
