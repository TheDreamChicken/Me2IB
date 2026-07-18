"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string; ok?: boolean };

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

export async function saveDocument(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const name = str(formData, "name");
  if (!name) return { error: "Name is required." };

  const payload: Record<string, string | null> = {
    name,
    doc_type: str(formData, "doc_type") ?? "resume",
    industry_target: str(formData, "industry_target"),
    notes: str(formData, "notes"),
  };

  // Only touch file_path when one was actually provided (upload flow) so
  // metadata edits never clobber an existing stored file.
  const filePath = str(formData, "file_path");
  if (filePath) payload.file_path = filePath;

  const id = str(formData, "id");
  const { error } = id
    ? await supabase
        .from("documents")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
    : await supabase.from("documents").insert({ ...payload, user_id: user.id });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/documents");
  revalidatePath("/dashboard");
  return { ok: true };
}

export type DocumentAiFeedback = {
  overview?: string;
  strengths?: string[];
  improvements?: string[];
  verdict?: string;
};

export async function saveDocumentAiFeedback(
  id: string,
  feedback: DocumentAiFeedback
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  // The feedback arrives from the client (which got it from the AI route),
  // so whitelist the shape instead of storing it blindly.
  const strings = (v: unknown): string[] | undefined =>
    Array.isArray(v)
      ? v.filter((s): s is string => typeof s === "string")
      : undefined;
  const clean: DocumentAiFeedback = {};
  if (typeof feedback?.overview === "string") clean.overview = feedback.overview;
  const strengths = strings(feedback?.strengths);
  if (strengths) clean.strengths = strengths;
  const improvements = strings(feedback?.improvements);
  if (improvements) clean.improvements = improvements;
  if (typeof feedback?.verdict === "string") clean.verdict = feedback.verdict;

  const { error } = await supabase
    .from("documents")
    .update({ ai_feedback: clean, ai_feedback_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/documents");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: doc } = await supabase
    .from("documents")
    .select("file_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  if (doc?.file_path) {
    const { error: removeError } = await supabase.storage
      .from("documents")
      .remove([doc.file_path]);
    if (removeError) {
      console.error(
        `Failed to remove stored file ${doc.file_path}:`,
        removeError.message
      );
    }
  }

  revalidatePath("/dashboard/documents");
  revalidatePath("/dashboard");
  return { ok: true };
}
