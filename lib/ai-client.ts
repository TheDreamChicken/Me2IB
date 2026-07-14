// Client-side helper for the /api/ai endpoint.

export type AiResult<T = unknown> = {
  text?: string;
  data?: T;
  error?: string;
  setup?: string; // present when ANTHROPIC_API_KEY is missing — show setup instructions
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
