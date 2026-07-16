"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, PenLine } from "lucide-react";
import { LinkedInIcon } from "@/components/icons";
import type { Contact } from "@/lib/types";
import { CONNECTION_STRENGTHS, INDUSTRIES } from "@/lib/constants";
import { upsertContact } from "@/lib/actions/contacts";
import {
  Button,
  Field,
  Input,
  Select,
  Spinner,
  Textarea,
  cn,
} from "@/components/ui";

/* ------------------------------------------------------------------ */
/* LinkedIn slug → name guess                                          */
/* ------------------------------------------------------------------ */

/**
 * Derive a display name from a LinkedIn profile URL slug.
 * e.g. linkedin.com/in/john-smith-1a2b3 -> "John Smith"
 * Trailing digit/hex id fragments are stripped; hyphen/period-separated
 * words are title-cased. Returns "" when no sensible name can be guessed.
 */
function nameFromLinkedInUrl(url: string): string {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (!match) return "";
  let slug = match[1];
  try {
    slug = decodeURIComponent(slug);
  } catch {
    // Keep the raw slug if it isn't valid percent-encoding.
  }
  const looksLikeId = (w: string) => /^[0-9a-f]+$/i.test(w) && /\d/.test(w);
  const words = slug.split(/[-.]+/).filter(Boolean);
  while (words.length > 1 && looksLikeId(words[words.length - 1])) {
    words.pop();
  }
  if (words.length === 0 || words.every(looksLikeId)) return "";
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5" aria-hidden>
        {[1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              i === step ? "bg-brand-500" : "bg-brand-200"
            )}
          />
        ))}
      </span>
      <span className="text-xs font-medium text-brand-900/60">
        {step} of 2 — {step === 1 ? "the basics" : "the good stuff"}
      </span>
    </div>
  );
}

function StartOption({
  active,
  icon,
  title,
  sub,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex-1 rounded-2xl border p-3 text-left transition-colors cursor-pointer",
        active
          ? "border-brand-400 bg-brand-50 ring-1 ring-brand-300"
          : "border-brand-100 bg-white hover:border-brand-200 hover:bg-brand-50/50"
      )}
    >
      <span
        className={cn(
          "mb-1.5 inline-flex rounded-lg p-1.5",
          active ? "bg-brand-200 text-brand-800" : "bg-brand-100 text-brand-500"
        )}
      >
        {icon}
      </span>
      <span className="block text-sm font-medium text-brand-900">{title}</span>
      <span className="block text-xs text-zinc-400">{sub}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Two-step add / edit form                                            */
/* ------------------------------------------------------------------ */

type FormState = {
  name: string;
  company: string;
  position: string;
  email: string;
  phone: string;
  linkedin_url: string;
  photo_url: string;
  location: string;
  industry: string;
  how_met: string;
  connection_strength: string;
  relationship: string;
  shared_interests: string;
  alma_mater: string;
  notes: string;
  tags: string;
  last_contacted: string;
  followup_interval_days: string;
  status: string;
};

export function ContactForm({
  contact,
  onDone,
}: {
  contact: Contact | null;
  onDone: () => void;
}) {
  const isEdit = !!contact;
  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<"linkedin" | "scratch">("linkedin");
  const [nameWasGuessed, setNameWasGuessed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState<FormState>(() => ({
    name: contact?.name ?? "",
    company: contact?.company ?? "",
    position: contact?.position ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    linkedin_url: contact?.linkedin_url ?? "",
    photo_url: contact?.photo_url ?? "",
    location: contact?.location ?? "",
    industry: contact?.industry ?? "",
    how_met: contact?.how_met ?? "",
    connection_strength: String(contact?.connection_strength ?? 2),
    relationship: contact?.relationship ?? "",
    shared_interests: contact?.shared_interests ?? "",
    alma_mater: contact?.alma_mater ?? "",
    notes: contact?.notes ?? "",
    tags: contact?.tags?.join(", ") ?? "",
    last_contacted: (contact?.last_contacted ?? "").slice(0, 10),
    followup_interval_days: String(contact?.followup_interval_days ?? 21),
    status: contact?.status ?? "active",
  }));

  const set =
    (key: keyof FormState) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  /** Fill the name from the LinkedIn slug if the user hasn't typed one. */
  function guessNameFromUrl() {
    if (form.name.trim()) return;
    const guess = nameFromLinkedInUrl(form.linkedin_url);
    if (!guess) return;
    setNameWasGuessed(true);
    setForm((f) => ({ ...f, name: guess }));
  }

  function goNext() {
    let name = form.name.trim();
    if (!name && mode === "linkedin") {
      const guess = nameFromLinkedInUrl(form.linkedin_url);
      if (guess) {
        name = guess;
        setNameWasGuessed(true);
        setForm((f) => ({ ...f, name: guess }));
      }
    }
    if (!name) {
      setError(
        mode === "linkedin" && !isEdit
          ? "Couldn't guess a name from that link — just type it in and you're set."
          : "Give them a name first — even just a first name works."
      );
      return;
    }
    setError(null);
    setStep(2);
  }

  // Runs on form submit (including Enter). On step 1, Enter means "Next".
  function submit() {
    if (step === 1) {
      goNext();
      return;
    }
    const fd = new FormData();
    if (contact) fd.set("id", contact.id);
    (Object.keys(form) as (keyof FormState)[]).forEach((k) =>
      fd.set(k, form[k])
    );
    startTransition(async () => {
      const res = await upsertContact(fd);
      if (res.error) setError(res.error);
      else onDone();
    });
  }

  const nameField = (
    <Field
      label="Name *"
      hint={
        nameWasGuessed
          ? "Guessed from the link — double-check the spelling."
          : undefined
      }
    >
      <Input
        value={form.name}
        onChange={(e) => {
          setNameWasGuessed(false);
          set("name")(e);
        }}
        placeholder="Jordan Lee"
        autoFocus={isEdit || mode === "scratch"}
      />
    </Field>
  );

  return (
    <form action={submit} className="space-y-4">
      <StepIndicator step={step} />

      {/* ---------------- Step 1: the basics ---------------- */}
      {step === 1 && (
        <div key={mode} className="space-y-4">
          {!isEdit && (
            <div className="flex gap-2">
              <StartOption
                active={mode === "linkedin"}
                onClick={() => setMode("linkedin")}
                icon={<LinkedInIcon className="h-4 w-4" />}
                title="Start with LinkedIn"
                sub="Paste their profile link"
              />
              <StartOption
                active={mode === "scratch"}
                onClick={() => setMode("scratch")}
                icon={<PenLine className="h-4 w-4" />}
                title="Start from scratch"
                sub="Just type what you know"
              />
            </div>
          )}

          {!isEdit && mode === "linkedin" ? (
            <>
              <Field label="Their LinkedIn URL">
                <Input
                  value={form.linkedin_url}
                  onChange={set("linkedin_url")}
                  onBlur={guessNameFromUrl}
                  placeholder="https://linkedin.com/in/..."
                  autoFocus
                />
              </Field>
              <p className="rounded-xl border border-dashed border-brand-200 bg-brand-50 px-3 py-2 text-xs leading-relaxed text-brand-700">
                We&apos;ll auto-pull their photo, role, and location once the AI
                connector ships — for now this grabs the link + name, and you
                can fill the rest in a sec.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">{nameField}</div>
                <Field label="Company">
                  <Input value={form.company} onChange={set("company")} />
                </Field>
                <Field label="Position">
                  <Input value={form.position} onChange={set("position")} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Email">
                    <Input
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                    />
                  </Field>
                </div>
              </div>
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">{nameField}</div>
              <Field label="Company">
                <Input value={form.company} onChange={set("company")} />
              </Field>
              <Field label="Position">
                <Input value={form.position} onChange={set("position")} />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                />
              </Field>
              <Field label="LinkedIn URL">
                <Input
                  value={form.linkedin_url}
                  onChange={set("linkedin_url")}
                  placeholder="https://linkedin.com/in/..."
                />
              </Field>
            </div>
          )}
        </div>
      )}

      {/* ---------------- Step 2: the good stuff ---------------- */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-400">
            All optional — jot down what you know, skip the rest.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="How you met / know them">
                <Input
                  value={form.how_met}
                  onChange={set("how_met")}
                  placeholder="Coffee chat via alumni database..."
                />
              </Field>
            </div>
            <Field label="Connection strength">
              <Select
                value={form.connection_strength}
                onChange={set("connection_strength")}
              >
                {CONNECTION_STRENGTHS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.value} — {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Industry">
              <Select value={form.industry} onChange={set("industry")}>
                <option value="">—</option>
                {INDUSTRIES.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Location">
              <Input value={form.location} onChange={set("location")} />
            </Field>
            <Field label="School / alma mater">
              <Input value={form.alma_mater} onChange={set("alma_mater")} />
            </Field>
            <Field label="Last contacted">
              <Input
                type="date"
                value={form.last_contacted}
                onChange={set("last_contacted")}
              />
            </Field>
            <Field
              label="Follow-up cadence (days)"
              hint="You'll get a nudge when this lapses."
            >
              <Input
                type="number"
                min={1}
                value={form.followup_interval_days}
                onChange={set("followup_interval_days")}
              />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={set("status")}>
                <option value="active">Active — keep warm</option>
                <option value="warm">Warm — occasional touch</option>
                <option value="dormant">Dormant</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
            <Field label="Tags" hint="Comma-separated, e.g. alumni, IB, mentor">
              <Input value={form.tags} onChange={set("tags")} />
            </Field>
          </div>
          <Field
            label="Shared interests"
            hint="Common ground makes outreach 10x easier."
          >
            <Textarea
              value={form.shared_interests}
              onChange={set("shared_interests")}
              placeholder="Both play tennis, both from Chicago, same fraternity..."
            />
          </Field>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={set("notes")} />
          </Field>
          <Field
            label="Photo URL"
            hint="(optional — auto photo pulling is coming)"
          >
            <Input value={form.photo_url} onChange={set("photo_url")} />
          </Field>
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          {step === 2 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setError(null);
                setStep(1);
              }}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onDone}>
            Cancel
          </Button>
          {step === 1 ? (
            <Button type="button" onClick={goNext}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : isEdit ? "Save changes" : "Add contact"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
