// Client-side helper for the /api/ai endpoint.

export type AiResult<T = unknown> = {
  text?: string;
  data?: T;
  error?: string;
  setup?: string; // present when no AI key (ANTHROPIC_API_KEY / OPENAI_API_KEY) is set — show setup instructions
  upgrade?: { needed: string; neededLabel: string }; // present when the user's tier doesn't cover the task
};

export async function callAI<T = unknown>(
  task: string,
  payload: Record<string, unknown> = {}
): Promise<AiResult<T>> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, payload }),
    });
    return (await res.json()) as AiResult<T>;
  } catch {
    return { error: "Network error — is the server running?" };
  }
}
