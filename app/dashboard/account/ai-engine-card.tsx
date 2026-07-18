"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Cpu, KeyRound } from "lucide-react";
import { Badge, Button, Card, Field, Input, Select, Spinner, cn } from "@/components/ui";
import { setAiModel } from "@/lib/actions/admin";
import {
  AI_MODEL_OPTIONS,
  DEFAULT_MODELS,
  modelLabel,
  providerForModel,
  type AiProvider,
} from "@/lib/ai-models";

const CUSTOM = "__custom__";

/**
 * Owner-only picker for the model behind every AI feature. Rendered only for
 * profiles with is_admin (granted exclusively via the Supabase SQL editor);
 * the server action and RLS re-check it, so this is display gating only.
 */
export function AiEngineCard({
  currentModel,
  hasAnthropicKey,
  hasOpenAIKey,
}: {
  currentModel: string | null;
  hasAnthropicKey: boolean;
  hasOpenAIKey: boolean;
}) {
  // With no override saved, show what the route actually falls back to.
  const effectiveModel =
    currentModel ??
    (hasAnthropicKey
      ? DEFAULT_MODELS.anthropic
      : hasOpenAIKey
        ? DEFAULT_MODELS.openai
        : null);

  const isCatalogModel = AI_MODEL_OPTIONS.some((o) => o.value === effectiveModel);
  const [choice, setChoice] = useState<string>(
    effectiveModel && isCatalogModel ? effectiveModel : effectiveModel ? CUSTOM : DEFAULT_MODELS.anthropic
  );
  const [customModel, setCustomModel] = useState(
    effectiveModel && !isCatalogModel ? effectiveModel : ""
  );
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedModel = choice === CUSTOM ? customModel.trim() : choice;
  const selectedProvider = selectedModel ? providerForModel(selectedModel) : null;
  const keyMissing =
    selectedProvider &&
    ((selectedProvider === "anthropic" && !hasAnthropicKey) ||
      (selectedProvider === "openai" && !hasOpenAIKey));

  function keyBadge(provider: AiProvider, present: boolean) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs",
          present ? "text-emerald-600" : "text-zinc-400"
        )}
      >
        <KeyRound className="h-3 w-3" />
        {provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"}{" "}
        {present ? "configured" : "not set"}
      </span>
    );
  }

  function save() {
    if (!selectedModel) {
      setError("Pick a model (or type a custom model ID) first.");
      return;
    }
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await setAiModel(selectedModel);
      if (res.error) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <section className="mt-6">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="rounded-xl bg-brand-100 p-2 text-brand-600">
            <Cpu className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-brand-900">AI engine</h2>
              <Badge className="bg-brand-100 text-brand-700">Admin only</Badge>
            </div>
            <p className="text-xs text-zinc-500">
              The model behind every AI feature site-wide. Currently:{" "}
              <span className="font-medium text-brand-900">
                {effectiveModel ? modelLabel(effectiveModel) : "not configured"}
              </span>
              {currentModel === null && effectiveModel && " (default)"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Model">
            <Select value={choice} onChange={(e) => setChoice(e.target.value)}>
              <optgroup label="Anthropic (Claude)">
                {AI_MODEL_OPTIONS.filter((o) => o.provider === "anthropic").map(
                  (o) => (
                    <option key={o.value} value={o.value}>
                      {o.label} — {o.note}
                    </option>
                  )
                )}
              </optgroup>
              <optgroup label="OpenAI (GPT)">
                {AI_MODEL_OPTIONS.filter((o) => o.provider === "openai").map(
                  (o) => (
                    <option key={o.value} value={o.value}>
                      {o.label} — {o.note}
                    </option>
                  )
                )}
              </optgroup>
              <option value={CUSTOM}>Custom model ID…</option>
            </Select>
          </Field>
          {choice === CUSTOM && (
            <Field
              label="Custom model ID"
              hint="Exact API ID, e.g. gpt-5.6-terra or claude-sonnet-5."
            >
              <Input
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="gpt-5.6-terra"
              />
            </Field>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          {keyBadge("anthropic", hasAnthropicKey)}
          {keyBadge("openai", hasOpenAIKey)}
        </div>
        {keyMissing && (
          <p className="mt-2 text-xs text-amber-600">
            Heads up: this model needs the{" "}
            {selectedProvider === "anthropic"
              ? "ANTHROPIC_API_KEY"
              : "OPENAI_API_KEY"}{" "}
            env var, which isn&apos;t set — AI features will show a setup notice
            until you add it and restart the server.
          </p>
        )}
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={save} disabled={pending} size="sm">
            {pending ? <Spinner /> : "Set AI engine"}
          </Button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved — takes effect on
              the next AI request
            </span>
          )}
        </div>
      </Card>
    </section>
  );
}
