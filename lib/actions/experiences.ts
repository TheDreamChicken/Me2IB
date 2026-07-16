"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string; ok?: boolean };

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

export async function upsertExperience(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const title = str(formData, "title");
  if (!title) return { error: "Title is required." };

  const isCurrent = formData.get("is_current") === "on";

  const payload = {
    title,
    organization: str(formData, "organization"),
    role_type: str(formData, "role_type") ?? "internship",
    start_date: str(formData, "start_date"),
    end_date: isCurrent ? null : str(formData, "end_date"),
    is_current: isCurrent,
    location: str(formData, "location"),
    description: str(formData, "description"),
    // Raw multiline string, one bullet per line.
    bullets: str(formData, "bullets"),
    link: str(formData, "link"),
    skills: (str(formData, "skills") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };

  const id = str(formData, "id");
  const { error } = id
    ? await supabase
        .from("experiences")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
    : await supabase
        .from("experiences")
        .insert({ ...payload, user_id: user.id });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/experience");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteExperience(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { error } = await supabase
    .from("experiences")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/experience");
  revalidatePath("/dashboard");
  return { ok: true };
}
