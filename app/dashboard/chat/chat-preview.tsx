"use client";

import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  ExternalLink,
  Landmark,
  Mail,
  MessageSquareText,
  Send,
  Sparkles,
} from "lucide-react";
import { Badge, Button, Card, Input, Select, cn } from "@/components/ui";
import type { Contact } from "@/lib/types";

export type ChatContact = Pick<
  Contact,
  | "id"
  | "name"
  | "company"
  | "position"
  | "shared_interests"
  | "last_contacted"
  | "relationship"
  | "notes"
>;

const PRESETS = [
  {
    label: "Run a consulting case",
    icon: BriefcaseBusiness,
    prompt:
      "Act as a consulting interviewer. Give me a realistic candidate-led case, reveal information only when I ask for it, challenge my structure and math, and give feedback only after I finish each section.",
  },
  {
    label: "Finance technical mock",
    icon: Landmark,
    prompt:
      "Run a finance technical interview with me. Start with accounting, move into valuation and transaction concepts, ask one question at a time, and use follow-ups based on my answer.",
  },
  {
    label: "Behavioral interview",
    icon: MessageSquareText,
    prompt:
      "Interview me on behavioral questions for competitive business roles. Ask one question at a time, probe weak or vague parts of my answer, then help me tighten it into a natural STAR response.",
  },
] as const;

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

export function ChatPreview({ contacts }: { contacts: ChatContact[] }) {
  const [draft, setDraft] = useState("");
  const [contactId, setContactId] = useState(contacts[0]?.id ?? "");
  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === contactId) ?? null,
    [contacts, contactId]
  );

  function injectContactPrompt() {
    if (!selectedContact) return;
    const lastTouch = selectedContact.last_contacted
      ? `We last spoke on ${selectedContact.last_contacted}.`
      : "I have not logged a prior conversation yet.";
    setDraft(
      `Help me draft a natural email to ${selectedContact.name}${
        selectedContact.position || selectedContact.company
          ? ` (${[selectedContact.position, selectedContact.company]
              .filter(Boolean)
              .join(" at ")})`
          : ""
      }. ${lastTouch}${
        selectedContact.shared_interests
          ? ` Shared interests: ${selectedContact.shared_interests}.`
          : ""
      }${
        selectedContact.relationship
          ? ` Relationship context: ${selectedContact.relationship}.`
          : ""
      }${selectedContact.notes ? ` My notes: ${selectedContact.notes}.` : ""} Keep it concise, personal, and not transactional.`
    );
  }

  return (
    <div className="mx-auto max-w-3xl pt-2 sm:pt-6">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-brand-900">
          Your AI recruiting assistant
        </h1>
        <p className="mt-1.5 max-w-lg text-sm text-zinc-500">
          Coming soon — the chat itself stays locked, but its quick-start prompts
          are laid out now for cases, finance technicals, behaviorals, and
          contact-aware outreach.
        </p>
      </div>

      <Card className="mt-7 border-dashed bg-brand-50/50 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-brand-900">Quick starts</h2>
            <p className="text-xs text-zinc-500">
              Pick one to preview the prompt that will start the conversation.
            </p>
          </div>
          <Badge>Locked preview</Badge>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setDraft(preset.prompt)}
              className={cn(
                "cursor-pointer rounded-xl border bg-white p-3 text-left transition-colors",
                draft === preset.prompt
                  ? "border-brand-400 ring-1 ring-brand-200"
                  : "border-brand-100 hover:border-brand-300"
              )}
            >
              <preset.icon className="h-4 w-4 text-brand-500" />
              <span className="mt-2 block text-sm font-medium text-brand-900">
                {preset.label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-brand-100 bg-white p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-xs font-medium text-brand-900/70">
                Draft an email for a contact
              </span>
              <Select
                value={contactId}
                onChange={(event) => setContactId(event.target.value)}
                disabled={contacts.length === 0}
              >
                {contacts.length === 0 ? (
                  <option value="">Add a contact first</option>
                ) : (
                  contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                      {contact.company ? ` — ${contact.company}` : ""}
                    </option>
                  ))
                )}
              </Select>
            </label>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={injectContactPrompt}
              disabled={!selectedContact}
            >
              <Mail className="h-3.5 w-3.5" /> Build prompt
            </Button>
          </div>
        </div>
      </Card>

      <Card className="mt-5 overflow-hidden">
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
          <UserBubble>How do I ask an alum for a referral without being awkward?</UserBubble>
          <AssistantBubble>
            Lead with the relationship, not the ask. Reference your last coffee
            chat, share a quick update, then make it easy to say yes. Want me to
            draft the message using your notes on them?
          </AssistantBubble>
        </div>

        <div className="flex items-center gap-2 border-t border-brand-100 p-3">
          <Input
            value={draft}
            readOnly
            placeholder="Choose a quick start to preview its prompt..."
            className="bg-brand-50/50"
          />
          <Button disabled aria-label="Send" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <Card className="mt-6 border-dashed bg-brand-50/50 p-5">
        <h2 className="font-medium text-brand-900">Meanwhile…</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Bring your own account until the built-in assistant ships — these make
          great sparring partners in the meantime.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <OutboundLink name="Claude" domain="claude.ai" href="https://claude.ai" />
          <OutboundLink name="ChatGPT" domain="chatgpt.com" href="https://chatgpt.com" />
        </div>
      </Card>
    </div>
  );
}
