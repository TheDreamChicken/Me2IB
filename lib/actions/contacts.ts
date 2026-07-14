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
    connection_strength: Number(formData.get("connection_strength") ?? 2),
    relationship: str(formData, "relationship"),
    shared_interests: str(formData, "shared_interests"),
    alma_mater: str(formData, "alma_mater"),
    notes: str(formData, "notes"),
    tags: (str(formData, "tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    last_contacted: str(formData, "last_contacted"),
    followup_interval_days: Number(formData.get("followup_interval_days") ?? 21),
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

export async function markContacted(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const today = new Date().toISOString().slice(0, 10);
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
