"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string; ok?: boolean };

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

/** Canonical behavioral prompts every recruit gets asked eventually. */
const STARTER_QUESTIONS: { question: string; category: string }[] = [
  { question: "Tell me about yourself", category: "behavioral" },
  { question: "Why this firm?", category: "why_firm" },
  { question: "Why this industry?", category: "why_industry" },
  { question: "Tell me about a time you led a team", category: "leadership" },
  { question: "Tell me about a time you failed", category: "challenge" },
  { question: "Tell me about a time you faced a challenge", category: "challenge" },
  {
    question: "Tell me about a time you worked on a team with conflict",
    category: "teamwork",
  },
  {
    question: "What's your greatest strength / weakness?",
    category: "strengths_weaknesses",
  },
  {
    question: "Tell me about a time you showed initiative",
    category: "leadership",
  },
  { question: "Walk me through your resume", category: "behavioral" },
];

export async function upsertStory(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const question = str(formData, "question");
  if (!question) return { error: "Question is required." };

  const payload = {
    question,
    category: str(formData, "category") ?? "behavioral",
    answer: str(formData, "answer"),
    notes: str(formData, "notes"),
    strength: str(formData, "strength") ?? "draft",
    tags: (str(formData, "tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };

  const id = str(formData, "id");
  const { error } = id
    ? await supabase
        .from("stories")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
    : await supabase.from("stories").insert({ ...payload, user_id: user.id });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/stories");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteStory(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { error } = await supabase
    .from("stories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/stories");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Bulk-insert the canonical prompts the user doesn't already have. */
export async function seedStarterQuestions(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: existing, error: fetchError } = await supabase
    .from("stories")
    .select("question")
    .eq("user_id", user.id);

  if (fetchError) return { error: fetchError.message };

  const have = new Set((existing ?? []).map((r) => r.question));
  const rows = STARTER_QUESTIONS.filter((q) => !have.has(q.question)).map(
    (q) => ({
      user_id: user.id,
      question: q.question,
      category: q.category,
      answer: null,
      notes: null,
      strength: "draft",
      tags: [] as string[],
    })
  );

  if (rows.length === 0) return { ok: true };

  const { error } = await supabase.from("stories").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/stories");
  revalidatePath("/dashboard");
  return { ok: true };
}
