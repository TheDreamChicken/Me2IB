import type { Metadata } from "next";
import { ExternalLink, Send, Sparkles } from "lucide-react";
import { Badge, Button, Card, Input } from "@/components/ui";

export const metadata: Metadata = { title: "AI Chat" };

/* ------------------------------------------------------------------ */
/* Mock chat bubbles                                                   */
/* ------------------------------------------------------------------ */

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm">
        {children}
      </p>
    </div>
  );
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-brand-50 px-4 py-2.5 text-sm leading-relaxed text-brand-900">
        {children}
      </p>
    </div>
  );
}

function OutboundLink({
  name,
  domain,
  href,
}: {
  name: string;
  domain: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-white px-4 py-3 transition-colors hover:border-brand-300 hover:bg-brand-50"
    >
      <div>
        <p className="text-sm font-medium text-brand-900">{name}</p>
        <p className="text-xs text-zinc-400">{domain}</p>
      </div>
      <ExternalLink className="h-4 w-4 text-brand-400 transition-colors group-hover:text-brand-600" />
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-2xl pt-2 sm:pt-6">
      {/* Hero */}
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-brand-900">
          Your AI recruiting assistant
        </h1>
        <p className="mt-1.5 max-w-md text-sm text-zinc-500">
          Coming soon — ask anything about recruiting, draft outreach, prep for
          interviews, or just vent.
        </p>
      </div>

      {/* Mock chat window */}
      <Card className="mt-8 overflow-hidden">
        <div className="flex items-center justify-between border-b border-brand-100 bg-brand-50/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-brand-900">me2IB assistant</p>
          </div>
          <Badge>Coming soon</Badge>
        </div>

        <div className="space-y-4 px-4 py-5 sm:px-6">
          <UserBubble>
            How do I ask an alum for a referral without being awkward?
          </UserBubble>
          <AssistantBubble>
            Lead with the relationship, not the ask. Reference your last coffee
            chat, share a quick update, then make it easy to say yes. Want me to
            draft the message using your notes on them?
          </AssistantBubble>
          <UserBubble>
            Yes please — and can you prep me for my superday on Friday?
          </UserBubble>
          <AssistantBubble>
            On it. We&apos;ll drill your stories, tighten &ldquo;why this
            bank,&rdquo; and run a paper LBO until it&apos;s second nature.
            You&apos;ve done the work — now we make it land.
          </AssistantBubble>
        </div>

        <div className="flex items-center gap-2 border-t border-brand-100 p-3">
          <Input
            disabled
            placeholder="Ask me anything about recruiting..."
            className="disabled:cursor-not-allowed disabled:bg-brand-50/50"
          />
          <Button disabled aria-label="Send" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Meanwhile */}
      <Card className="mt-6 border-dashed bg-brand-50/50 p-5">
        <h2 className="font-medium text-brand-900">Meanwhile…</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Bring your own account until the built-in assistant ships — these make
          great sparring partners in the meantime.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <OutboundLink name="Claude" domain="claude.ai" href="https://claude.ai" />
          <OutboundLink
            name="ChatGPT"
            domain="chatgpt.com"
            href="https://chatgpt.com"
          />
        </div>
      </Card>
    </div>
  );
}
