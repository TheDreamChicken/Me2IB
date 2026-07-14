import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MODEL = "claude-opus-4-8";

/**
 * Single AI endpoint for the whole app.
 * POST { task, payload } -> { text } or { data } depending on task.
 *
 * Tasks:
 *  - review_document: { name, docType, industry, content } -> { data: { overview, strengths[], improvements[], verdict } }
 *  - plan:            { profile, stats } -> { text: markdown }
 *  - chat:            { messages: [{role, content}] } -> { text }
 *  - outreach:        { contact, profile } -> { text: markdown }
 *  - opportunities:   { industries[], location, keywords } -> { data: [{title, company, industry, location, link, source, notes}] }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error: "AI is not configured yet.",
        setup:
          "Add ANTHROPIC_API_KEY=sk-ant-... to your .env.local file (get a key at https://platform.claude.com), then restart the dev server. AI features light up automatically.",
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

  const client = new Anthropic();

  try {
    switch (task) {
      case "review_document":
        return NextResponse.json(await reviewDocument(client, payload));
      case "plan":
        return NextResponse.json(await generatePlan(client, payload));
      case "chat":
        return NextResponse.json(await chat(client, payload));
      case "outreach":
        return NextResponse.json(await outreach(client, payload));
      case "opportunities":
        return NextResponse.json(await scanOpportunities(client, payload));
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
    console.error("AI route error:", err);
    return NextResponse.json(
      { error: "AI request failed. Try again." },
      { status: 500 }
    );
  }
}

function textOf(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

/* ------------------------------------------------------------------ */
/* Document review                                                     */
/* ------------------------------------------------------------------ */

async function reviewDocument(client: Anthropic, p: Record<string, unknown>) {
  const content = String(p.content ?? "").slice(0, 60_000);
  if (!content.trim()) {
    return { error: "Paste the document text first so I have something to review." };
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system:
      "You are a brutally honest but supportive recruiting coach who has reviewed thousands of resumes and cover letters for finance, consulting, and other business roles. Give feedback that is specific to the document — quote actual lines. Balance genuine praise with genuinely critical feedback; students need honesty to improve. Calibrate to the target industry's norms.",
    messages: [
      {
        role: "user",
        content: `Review this ${p.docType ?? "document"} targeting ${
          p.industry || "business roles generally"
        }. Document name: ${p.name ?? "untitled"}.\n\n---\n${content}\n---`,
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
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
      },
    },
  });

  return { data: JSON.parse(textOf(response)) };
}

/* ------------------------------------------------------------------ */
/* Recruitment plan                                                    */
/* ------------------------------------------------------------------ */

async function generatePlan(client: Anthropic, p: Record<string, unknown>) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 12000,
    thinking: { type: "adaptive" },
    system:
      "You are an expert undergraduate recruiting mentor who demystifies finance/consulting/business recruiting timelines. You produce personalized, month-by-month recruiting roadmaps. Be concrete: name the months, the actions, realistic weekly time commitments, and how to convert networking into referrals. Assume the reader finds recruiting confusing — explain jargon on first use. Output clean markdown with headers, and keep an encouraging but honest tone about how early timelines run.",
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
        )}\n\nToday's date: ${new Date().toISOString().slice(0, 10)}.\n\nInclude: (1) where I am on the timeline right now and what cycle I should target, (2) a month-by-month roadmap until applications close, (3) networking — what it is, how many coffee chats per week, email templates I can adapt, (4) how to convert networking into referrals and direct applications, (5) how to weave personal interests into outreach, (6) materials checklist, (7) what to do THIS week.`,
      },
    ],
  });

  return { text: textOf(response) };
}

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

async function chat(client: Anthropic, p: Record<string, unknown>) {
  const rawMessages = Array.isArray(p.messages) ? p.messages : [];
  const messages: Anthropic.MessageParam[] = rawMessages
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

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system:
      "You are the built-in recruiting assistant for me2IB, a recruiting hub for students breaking into finance, consulting, and business careers. Help with anything recruiting-related: networking strategy, outreach drafts, interview prep, technicals, behavioral answers, timeline questions, or just venting about the process. Be warm, direct, and practical. Keep answers focused and reasonably concise unless asked to go deep." +
      (p.context ? `\n\nContext about this user: ${JSON.stringify(p.context)}` : ""),
    messages,
  });

  return { text: textOf(response) };
}

/* ------------------------------------------------------------------ */
/* Outreach suggestions                                                */
/* ------------------------------------------------------------------ */

async function outreach(client: Anthropic, p: Record<string, unknown>) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 6000,
    thinking: { type: "adaptive" },
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

  return { text: textOf(response) };
}

/* ------------------------------------------------------------------ */
/* Opportunity scan (uses server-side web search)                      */
/* ------------------------------------------------------------------ */

async function scanOpportunities(client: Anthropic, p: Record<string, unknown>) {
  const industries = Array.isArray(p.industries) && p.industries.length
    ? (p.industries as string[]).join(", ")
    : "finance and consulting";
  const location = p.location ? String(p.location) : "United States";
  const keywords = p.keywords ? String(p.keywords) : "";

  let messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Search the web for CURRENTLY OPEN internship/entry-level opportunities for university students in: ${industries}. Location preference: ${location}. ${
        keywords ? `Extra keywords: ${keywords}.` : ""
      }\n\nToday is ${new Date().toISOString().slice(0, 10)}. Find real, current postings (company career pages, job boards, application portals). Prefer postings with clear application links.\n\nWhen done searching, output ONLY a JSON array (no prose, no markdown fence) of up to 12 objects with keys: title, company, industry (one of: finance, consulting, marketing, operations, tech, data, real_estate, other), location, link, source, deadline (YYYY-MM-DD or null), notes (one line on why it's interesting or what it requires).`,
    },
  ];

  let response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    tools: [
      {
        type: "web_search_20260209",
        name: "web_search",
        max_uses: 8,
      },
    ],
    messages,
  });

  // Server-side tool loop can pause; resume up to 3 times.
  let continuations = 0;
  while (response.stop_reason === "pause_turn" && continuations < 3) {
    messages = [...messages, { role: "assistant", content: response.content }];
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 8 }],
      messages,
    });
    continuations++;
  }

  const text = textOf(response);
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
