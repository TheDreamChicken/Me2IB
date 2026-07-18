import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  hasFeature,
  normalizeTier,
  requiredTier,
  TIER_INFO,
  type GatedFeature,
} from "@/lib/tiers";

import { DEFAULT_MODELS, providerForModel } from "@/lib/ai-models";

/**
 * Single AI endpoint for the whole app.
 * POST { task, payload } -> { text } or { data } depending on task.
 *
 * Works with EITHER provider — add one key to .env.local:
 *   ANTHROPIC_API_KEY=sk-ant-...  (https://platform.claude.com)
 *   OPENAI_API_KEY=sk-...         (https://platform.openai.com)
 * If both are set, Anthropic wins unless AI_PROVIDER=openai overrides.
 *
 * Tasks:
 *  - review_document: { documentId } -> { data: { overview, strengths[], improvements[], verdict } }
 *  - plan:            { profile, stats } -> { text: markdown }
 *  - chat:            { messages: [{role, content}] } -> { text }
 *  - outreach:        { contact, profile } -> { text: markdown }
 *  - opportunities:   { industries[], location, keywords } -> { data: [{title, company, industry, location, link, source, notes}] }
 *  - parse_contact:   { url, text? } -> { data: { name, company, position, ... } } (LinkedIn import — free tier)
 */

// Server-side tier gate per task (UI gates too; this is defense in depth).
// parse_contact (LinkedIn import) is intentionally free.
const TASK_FEATURE: Record<string, GatedFeature | null> = {
  review_document: "ai_review",
  plan: "ai_plan",
  chat: "ai_chat",
  outreach: "ai_outreach",
  opportunities: "ai_import",
  parse_contact: null,
};

/* ------------------------------------------------------------------ */
/* Provider layer                                                      */
/* ------------------------------------------------------------------ */

type Provider = "anthropic" | "openai";

/** Which model runs everything: provider is inferred from the model ID. */
type AiConfig = { provider: Provider; model: string };

function keyFor(provider: Provider): string | undefined {
  return provider === "anthropic"
    ? process.env.ANTHROPIC_API_KEY
    : process.env.OPENAI_API_KEY;
}

function resolveProvider(): Provider | null {
  const forced = process.env.AI_PROVIDER;
  if (forced === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY)
    return "anthropic";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

type ChatMessage = { role: "user" | "assistant"; content: string };

type GenerateOptions = {
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
  /** JSON schema for structured output (strict: all props required, no extras). */
  schema?: Record<string, unknown>;
  /** Allow the provider's server-side web search tool. */
  webSearch?: boolean;
  /** A private PDF already downloaded for this authenticated request. */
  pdf?: { base64: string; filename: string };
};

/** Thrown by the OpenAI path so the route can map HTTP status → friendly error. */
class OpenAIError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

async function generate(ai: AiConfig, o: GenerateOptions): Promise<string> {
  return ai.provider === "anthropic"
    ? generateAnthropic(ai.model, o)
    : generateOpenAI(ai.model, o);
}

async function generateAnthropic(
  model: string,
  o: GenerateOptions
): Promise<string> {
  const client = new Anthropic();
  let attachedPdf = false;
  const inputMessages: Anthropic.MessageParam[] = o.messages.map((message) => {
    if (!o.pdf || attachedPdf || message.role !== "user") return message;
    attachedPdf = true;
    return {
      role: "user",
      content: [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: o.pdf.base64,
          },
        },
        { type: "text", text: message.content },
      ],
    };
  });

  const params: Anthropic.MessageCreateParamsNonStreaming = {
    model,
    max_tokens: o.maxTokens,
    thinking: { type: "adaptive" },
    system: o.system,
    messages: inputMessages,
    ...(o.webSearch
      ? {
          tools: [
            { type: "web_search_20260209" as const, name: "web_search", max_uses: 8 },
          ],
        }
      : {}),
    ...(o.schema
      ? {
          output_config: {
            format: { type: "json_schema" as const, schema: o.schema },
          },
        }
      : {}),
  };

  let messages: Anthropic.MessageParam[] = inputMessages;
  let response = await client.messages.create({ ...params, messages });

  // Server-side tool loop can pause; resume up to 3 times.
  let continuations = 0;
  while (response.stop_reason === "pause_turn" && continuations < 3) {
    messages = [...messages, { role: "assistant", content: response.content }];
    response = await client.messages.create({ ...params, messages });
    continuations++;
  }

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

async function generateOpenAI(
  model: string,
  o: GenerateOptions
): Promise<string> {
  let attachedPdf = false;
  const input = o.messages.map((message) => {
    if (!o.pdf || attachedPdf || message.role !== "user") {
      return { role: message.role, content: message.content };
    }
    attachedPdf = true;
    return {
      role: "user",
      content: [
        {
          type: "input_file",
          filename: o.pdf.filename,
          file_data: `data:application/pdf;base64,${o.pdf.base64}`,
        },
        { type: "input_text", text: message.content },
      ],
    };
  });

  const body: Record<string, unknown> = {
    model,
    instructions: o.system,
    input,
    // Reasoning tokens count toward the cap on gpt-5, so keep headroom.
    max_output_tokens: Math.max(o.maxTokens, 4000),
  };
  if (o.schema) {
    body.text = {
      format: {
        type: "json_schema",
        name: "result",
        strict: true,
        schema: o.schema,
      },
    };
  }
  if (o.webSearch) {
    body.tools = [{ type: "web_search" }];
  }

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new OpenAIError(res.status, detail.slice(0, 500));
  }

  const data = (await res.json()) as {
    output?: {
      type: string;
      content?: { type: string; text?: string }[];
    }[];
  };
  return (data.output ?? [])
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((c) => c.type === "output_text")
    .map((c) => c.text ?? "")
    .join("\n");
}

/* ------------------------------------------------------------------ */
/* Route                                                               */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  // The active model is an app-wide setting (admin-editable in Account →
  // AI engine). Without a row — or before schema.sql adds the table — fall
  // back to env-key-based defaults.
  let ai: AiConfig | null = null;
  const { data: modelRow } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "ai_model")
    .maybeSingle();
  const configuredModel = modelRow?.value?.trim() || null;

  if (configuredModel) {
    const provider = providerForModel(configuredModel);
    if (!provider) {
      return NextResponse.json(
        {
          error: `The configured AI model "${configuredModel}" isn't a recognized claude-* or gpt-* ID — fix it in Account → AI engine.`,
        },
        { status: 503 }
      );
    }
    if (!keyFor(provider)) {
      const keyName =
        provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
      return NextResponse.json(
        {
          error: `The AI model is set to ${configuredModel}, but there's no ${keyName} configured.`,
          setup: `The AI engine is set to ${configuredModel}, which needs ${keyName} in .env.local (then restart the dev server) — or switch to a model from the other provider in Account → AI engine.`,
        },
        { status: 503 }
      );
    }
    ai = { provider, model: configuredModel };
  } else {
    const provider = resolveProvider();
    if (provider) ai = { provider, model: DEFAULT_MODELS[provider] };
  }

  if (!ai) {
    return NextResponse.json(
      {
        error: "AI is not configured yet.",
        setup:
          "Add ONE key to your .env.local — either ANTHROPIC_API_KEY=sk-ant-... (get one at https://platform.claude.com) or OPENAI_API_KEY=sk-... (https://platform.openai.com) — then restart the dev server. Every AI feature works with either provider.",
      },
      { status: 503 }
    );
  }

  let body: { task?: string; payload?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { task, payload = {} } = body;

  const feature = TASK_FEATURE[task ?? ""];
  if (feature) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("tier")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!hasFeature(normalizeTier(prof?.tier), feature)) {
      const needed = requiredTier(feature);
      return NextResponse.json(
        {
          error: `This is a ${TIER_INFO[needed].label} feature — upgrade in Account → Plan to use it.`,
          upgrade: { needed, neededLabel: TIER_INFO[needed].label },
        },
        { status: 403 }
      );
    }
  }

  try {
    switch (task) {
      case "review_document":
        return NextResponse.json(
          await reviewDocument(ai, payload, supabase, user.id)
        );
      case "plan":
        return NextResponse.json(await generatePlan(ai, payload));
      case "chat":
        return NextResponse.json(await chat(ai, payload));
      case "outreach":
        return NextResponse.json(await outreach(ai, payload));
      case "opportunities":
        return NextResponse.json(await scanOpportunities(ai, payload));
      case "parse_contact":
        return NextResponse.json(await parseContact(ai, payload));
      default:
        return NextResponse.json({ error: "Unknown task." }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Your ANTHROPIC_API_KEY appears to be invalid." },
        { status: 503 }
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "AI is rate-limited right now — try again in a minute." },
        { status: 429 }
      );
    }
    if (err instanceof OpenAIError) {
      if (err.status === 401 || err.status === 403) {
        return NextResponse.json(
          { error: "Your OPENAI_API_KEY appears to be invalid." },
          { status: 503 }
        );
      }
      if (err.status === 429) {
        return NextResponse.json(
          { error: "AI is rate-limited right now — try again in a minute." },
          { status: 429 }
        );
      }
    }
    console.error("AI route error:", err);
    return NextResponse.json(
      { error: "AI request failed. Try again." },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/* Document review                                                     */
/* ------------------------------------------------------------------ */

async function reviewDocument(
  ai: AiConfig,
  p: Record<string, unknown>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const documentId = String(p.documentId ?? "").trim();
  if (!documentId) return { error: "Choose an uploaded PDF to review." };

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("name, doc_type, industry_target, file_path")
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (documentError) return { error: documentError.message };
  if (!document?.file_path) {
    return { error: "That document does not have an uploaded file." };
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from("documents")
    .download(document.file_path);
  if (downloadError || !file) {
    return { error: downloadError?.message ?? "Could not read that PDF." };
  }

  const pdf = Buffer.from(await file.arrayBuffer());
  if (pdf.length > 20 * 1024 * 1024) {
    return { error: "That PDF is over 20 MB — upload a smaller copy to review." };
  }
  const headerAt = pdf.indexOf("%PDF-", 0, "ascii");
  if (headerAt < 0 || headerAt > 1024) {
    return { error: "AI review currently supports PDF files only." };
  }

  const storedName = document.file_path.split("/").pop() ?? "document.pdf";
  const filename = storedName.replace(/[^a-zA-Z0-9._-]/g, "_");

  const text = await generate(ai, {
    maxTokens: 8000,
    system:
      "You are a brutally honest but supportive recruiting coach who has reviewed thousands of resumes and cover letters for finance, consulting, and other business roles. Give feedback that is specific to the document — quote actual lines. Balance genuine praise with genuinely critical feedback; students need honesty to improve. Calibrate to the target industry's norms.",
    messages: [
      {
        role: "user",
        content: `Review the attached ${document.doc_type ?? "document"} targeting ${
          document.industry_target || "business roles generally"
        }. Document name: ${document.name ?? "untitled"}. Read the PDF itself, including its layout and every visible line.`,
      },
    ],
    pdf: { base64: pdf.toString("base64"), filename },
    schema: {
      type: "object",
      properties: {
        overview: {
          type: "string",
          description: "2-4 sentence honest overall assessment",
        },
        strengths: {
          type: "array",
          items: { type: "string" },
          description: "Specific things done well, quoting the document",
        },
        improvements: {
          type: "array",
          items: { type: "string" },
          description:
            "Specific, actionable criticisms — the honest ones. Quote lines that need work.",
        },
        verdict: {
          type: "string",
          description:
            "One-line verdict, e.g. 'Ready to submit after fixing bullets 2-3' or 'Needs a rewrite before any BB application'",
        },
      },
      required: ["overview", "strengths", "improvements", "verdict"],
      additionalProperties: false,
    },
  });

  return { data: JSON.parse(text) };
}

/* ------------------------------------------------------------------ */
/* Recruitment plan                                                    */
/* ------------------------------------------------------------------ */

async function generatePlan(ai: AiConfig, p: Record<string, unknown>) {
  const text = await generate(ai, {
    maxTokens: 12000,
    system:
      "You are an expert undergraduate recruiting mentor who demystifies finance/consulting/business recruiting timelines. You produce personalized, month-by-month recruiting roadmaps. Be concrete: name the months, the actions, realistic weekly time commitments, and how to convert networking into referrals. Treat the app-supplied deterministic timing anchors as the source of truth; never shift an application window a year later. Distinguish early preparation/networking from the actual application window, and note that firm-specific dates can vary. Assume the reader finds recruiting confusing — explain jargon on first use. Output clean markdown with headers, and keep an encouraging but honest tone about how early timelines run.",
    messages: [
      {
        role: "user",
        content: `Build my personalized recruiting plan.\n\nMy profile:\n${JSON.stringify(
          p.profile ?? {},
          null,
          2
        )}\n\nMy current tracker stats (use these to tailor advice, e.g. if I have 0 contacts, start with networking basics):\n${JSON.stringify(
          p.stats ?? {},
          null,
          2
        )}\n\nDeterministic timing anchors calculated by the app:\n${JSON.stringify(
          p.timelineAnchors ?? [],
          null,
          2
        )}\n\nToday's date: ${new Date().toISOString().slice(0, 10)}.\n\nInclude: (1) where I am on the timeline right now and what cycle I should target, (2) a month-by-month roadmap until applications close, (3) networking — what it is, how many coffee chats per week, email templates I can adapt, (4) how to convert networking into referrals and direct applications, (5) how to weave personal interests into outreach, (6) materials checklist, (7) what to do THIS week.`,
      },
    ],
  });

  return { text };
}

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

async function chat(ai: AiConfig, p: Record<string, unknown>) {
  const rawMessages = Array.isArray(p.messages) ? p.messages : [];
  const messages: ChatMessage[] = rawMessages
    .filter(
      (m): m is { role: string; content: string } =>
        !!m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .slice(-30)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return { error: "Send a message first." };
  }

  const text = await generate(ai, {
    maxTokens: 8000,
    system:
      "You are the built-in recruiting assistant for me2IB, a recruiting hub for students breaking into finance, consulting, and business careers. Help with anything recruiting-related: networking strategy, outreach drafts, interview prep, technicals, behavioral answers, timeline questions, or just venting about the process. Be warm, direct, and practical. Keep answers focused and reasonably concise unless asked to go deep." +
      (p.context ? `\n\nContext about this user: ${JSON.stringify(p.context)}` : ""),
    messages,
  });

  return { text };
}

/* ------------------------------------------------------------------ */
/* Outreach suggestions                                                */
/* ------------------------------------------------------------------ */

async function outreach(ai: AiConfig, p: Record<string, unknown>) {
  const text = await generate(ai, {
    maxTokens: 6000,
    system:
      "You are a networking coach for students. Draft natural, non-cringe outreach that a real student would send. Short emails win. If the user and contact share interests or background, weave that in naturally — shared ground is the best opener. Output markdown: a quick strategy note, then 1-2 ready-to-send drafts (subject + body), then a follow-up cadence suggestion.",
    messages: [
      {
        role: "user",
        content: `Help me reach out to this contact.\n\nContact:\n${JSON.stringify(
          p.contact ?? {},
          null,
          2
        )}\n\nAbout me:\n${JSON.stringify(p.profile ?? {}, null, 2)}\n\nGoal: ${
          p.goal ?? "reconnect / keep the relationship warm and move toward a referral"
        }`,
      },
    ],
  });

  return { text };
}

/* ------------------------------------------------------------------ */
/* Contact parse (LinkedIn import — exact URL web lookup + metadata)  */
/* ------------------------------------------------------------------ */

async function parseContact(ai: AiConfig, p: Record<string, unknown>) {
  const text = String(p.text ?? "").slice(0, 20_000);
  const url = String(p.url ?? "").trim().slice(0, 2_000);
  if (!text.trim() && !url) {
    return { error: "Add a LinkedIn profile URL first." };
  }

  const nullableString = { type: ["string", "null"] };
  const result = await generate(ai, {
    maxTokens: 2000,
    webSearch: !!url,
    system:
      "You research and extract contact fields from an exact LinkedIn profile URL and any supplied public page metadata. Search the public web for that exact URL and corroborating public professional pages. Pull every verifiable current field you can, but never guess from the URL slug or combine different people. Use null when a field cannot be verified. For industry, map to the closest of: finance, consulting, marketing, operations, tech, data, real_estate, other. Make a deliberate attempt to find the same person's public LinkedIn profile image in page metadata or a media.licdn.com result. photo_url must be a direct publicly loadable image URL for that person, never a logo or webpage URL; otherwise use null.",
    messages: [
      {
        role: "user",
        content: `Research and extract the person at this exact LinkedIn profile URL: ${
          url || "not supplied"
        }.\n\nPublic metadata fetched directly from the page, if available:\n---\n${
          text || "LinkedIn blocked the direct page request; use web search."
        }\n---\n\nCross-check the identity carefully. Return all currently verifiable fields from public sources.`,
      },
    ],
    schema: {
      type: "object",
      properties: {
        name: nullableString,
        company: nullableString,
        position: nullableString,
        location: nullableString,
        industry: nullableString,
        email: nullableString,
        phone: nullableString,
        linkedin_url: nullableString,
        photo_url: nullableString,
        alma_mater: nullableString,
        shared_interests: {
          type: ["string", "null"],
          description: "Interests/activities mentioned that could be conversation starters",
        },
        relationship: {
          type: ["string", "null"],
          description: "One line on who they are / what they do",
        },
      },
      required: [
        "name",
        "company",
        "position",
        "location",
        "industry",
        "email",
        "phone",
        "linkedin_url",
        "photo_url",
        "alma_mater",
        "shared_interests",
        "relationship",
      ],
      additionalProperties: false,
    },
  });

  return { data: JSON.parse(result) };
}

/* ------------------------------------------------------------------ */
/* Opportunity scan (uses server-side web search)                      */
/* ------------------------------------------------------------------ */

async function scanOpportunities(ai: AiConfig, p: Record<string, unknown>) {
  const industries = Array.isArray(p.industries) && p.industries.length
    ? (p.industries as string[]).join(", ")
    : "finance and consulting";
  const location = p.location ? String(p.location) : "United States";
  const keywords = p.keywords ? String(p.keywords) : "";

  const text = await generate(ai, {
    maxTokens: 16000,
    webSearch: true,
    system:
      "You are a diligent recruiting researcher. Use web search to find real, currently open postings and report them exactly in the format the user asks for.",
    messages: [
      {
        role: "user",
        content: `Search the web for CURRENTLY OPEN internship/entry-level opportunities for university students in: ${industries}. Location preference: ${location}. ${
          keywords ? `Extra keywords: ${keywords}.` : ""
        }\n\nToday is ${new Date().toISOString().slice(0, 10)}. Find real, current postings (company career pages, job boards, application portals). Prefer postings with clear application links.\n\nWhen done searching, output ONLY a JSON array (no prose, no markdown fence) of up to 12 objects with keys: title, company, industry (one of: finance, consulting, marketing, operations, tech, data, real_estate, other), location, link, source, deadline (YYYY-MM-DD or null), notes (one line on why it's interesting or what it requires).`,
      },
    ],
  });

  // Model was asked for bare JSON, but parse defensively.
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    return {
      error:
        "The scan finished but returned an unexpected format. Try again — search results vary.",
    };
  }
  try {
    const data = JSON.parse(text.slice(start, end + 1));
    return { data };
  } catch {
    return { error: "Could not parse scan results. Try scanning again." };
  }
}
