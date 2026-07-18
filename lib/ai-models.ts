// The AI model catalog: which models the admin can pick for /api/ai.
// Pure shared module — safe to import from server and client code.
// The active model lives in the app_settings table (key "ai_model");
// without a row, DEFAULT_MODELS[provider] applies.

export type AiProvider = "anthropic" | "openai";

export type AiModelOption = {
  value: string; // exact API model ID
  label: string;
  provider: AiProvider;
  note: string; // shown in the picker — capability + rough $/MTok in/out
};

export const AI_MODEL_OPTIONS: AiModelOption[] = [
  // Anthropic
  {
    value: "claude-opus-4-8",
    label: "Claude Opus 4.8",
    provider: "anthropic",
    note: "Anthropic flagship — deepest reasoning ($5 / $25 per MTok)",
  },
  {
    value: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    provider: "anthropic",
    note: "Near-Opus quality, faster and cheaper ($3 / $15)",
  },
  {
    value: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    provider: "anthropic",
    note: "Fastest, most economical ($1 / $5)",
  },
  // OpenAI — GPT-5.6 family (Jul 2026); all run on the Responses API
  {
    value: "gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    provider: "openai",
    note: "OpenAI flagship — complex reasoning ($5 / $30 per MTok)",
  },
  {
    value: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    provider: "openai",
    note: "Balanced intelligence and cost ($2.50 / $15)",
  },
  {
    value: "gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    provider: "openai",
    note: "Cost-efficient tier ($1 / $6)",
  },
  {
    value: "gpt-5",
    label: "GPT-5",
    provider: "openai",
    note: "Previous OpenAI flagship",
  },
];

/** Defaults when no app_settings override exists. */
export const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: "claude-opus-4-8",
  openai: "gpt-5.6-sol",
};

/**
 * Infer the provider from a model ID so custom/future model strings work
 * without a catalog update. Returns null for unrecognized families.
 */
export function providerForModel(model: string): AiProvider | null {
  const m = model.trim().toLowerCase();
  if (m.startsWith("claude")) return "anthropic";
  if (m.startsWith("gpt") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4")) {
    return "openai";
  }
  return null;
}

export function modelLabel(model: string): string {
  return AI_MODEL_OPTIONS.find((o) => o.value === model)?.label ?? model;
}
