"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STARRED_CLASSICS } from "@/lib/classic-questions";
import { STORY_CATEGORIES } from "@/lib/constants";

export type ActionResult = { error?: string; ok?: boolean };

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

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
    firm: str(formData, "firm"),
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

/**
 * Bulk-insert classic questions the user doesn't already have (matched on the
 * exact question string). Returns how many rows were actually inserted.
 */
export async function addClassicQuestions(
  questions: { question: string; category: string }[]
): Promise<ActionResult & { added?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  // Server actions are reachable as raw POST endpoints — never trust the
  // wire shape. Drop malformed items, cap batch size and question length.
  if (!Array.isArray(questions)) return { error: "Bad request." };
  const submitted = questions
    .filter(
      (q): q is { question: string; category: string } =>
        !!q &&
        typeof q === "object" &&
        typeof q.question === "string" &&
        typeof q.category === "string"
    )
    .slice(0, 100)
    .map((q) => ({ question: q.question.slice(0, 500), category: q.category }));

  const validCategories = new Set<string>(
    STORY_CATEGORIES.map((c) => c.value)
  );
  const invalid = submitted.find((q) => !validCategories.has(q.category));
  if (invalid) return { error: `Unknown category "${invalid.category}".` };

  const { data: existing, error: fetchError } = await supabase
    .from("stories")
    .select("question")
    .eq("user_id", user.id);

  if (fetchError) return { error: fetchError.message };

  // Dedupe against the bank AND within the batch itself.
  const have = new Set((existing ?? []).map((r) => r.question));
  const rows = submitted
    .filter((q) => {
      const question = q.question.trim();
      if (!question || have.has(question)) return false;
      have.add(question);
      return true;
    })
    .map((q) => ({
      user_id: user.id,
      question: q.question.trim(),
      category: q.category,
      answer: null,
      notes: null,
      strength: "draft",
      firm: null,
      tags: [] as string[],
    }));

  if (rows.length === 0) return { ok: true, added: 0 };

  const { error } = await supabase.from("stories").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/stories");
  revalidatePath("/dashboard");
  return { ok: true, added: rows.length };
}

/** Seed the bank with the starred classics (the near-universal questions). */
export async function seedStarterQuestions(): Promise<ActionResult> {
  return addClassicQuestions(
    STARRED_CLASSICS.map((q) => ({ question: q.question, category: q.category }))
  );
}
