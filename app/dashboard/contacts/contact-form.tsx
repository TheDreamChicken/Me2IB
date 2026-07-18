"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, PenLine, Sparkles } from "lucide-react";
import { LinkedInIcon } from "@/components/icons";
import type { Contact } from "@/lib/types";
import { CONNECTION_STRENGTHS, INDUSTRIES } from "@/lib/constants";
import { upsertContact } from "@/lib/actions/contacts";
import { callAI } from "@/lib/ai-client";
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

/** Fields the parse_contact AI task can return — keys map 1:1 to FormState. */
const PARSE_KEYS = [
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
] as const;

type ParsedContact = Partial<
  Record<(typeof PARSE_KEYS)[number], string | null>
>;

type LinkedInProfileResponse = {
  profileText?: string;
  photoUrl?: string | null;
  error?: string;
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Public page metadata first, then exact-URL AI web research as a fallback.
  const [parsePending, startParse] = useTransition();
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSetup, setParseSetup] = useState<string | null>(null);
  const [parseDone, setParseDone] = useState(false);

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

  /** Pull the public profile from the URL, then merge every field it exposes. */
  function runParse() {
    const linkedinUrl = form.linkedin_url.trim();
    if (!linkedinUrl) return;
    setParseError(null);
    setParseSetup(null);
    setParseDone(false);
    startParse(async () => {
      let pulled: LinkedInProfileResponse = {};
      let pullWarning: string | null = null;
      try {
        const response = await fetch(
          `/dashboard/contacts/linkedin?url=${encodeURIComponent(linkedinUrl)}`
        );
        pulled = (await response.json()) as LinkedInProfileResponse;
        if (!response.ok) {
          pullWarning = pulled.error ?? "LinkedIn blocked the direct profile page.";
          pulled = {};
        }
      } catch {
        pullWarning = "LinkedIn blocked the direct profile page.";
      }

      if (pulled.photoUrl?.trim()) {
        setForm((current) => ({
          ...current,
          photo_url: pulled.photoUrl!.trim(),
        }));
      }

      const res = await callAI<ParsedContact>("parse_contact", {
        url: linkedinUrl,
        text: pulled.profileText ?? "",
      });
      if (res.setup) {
        setParseSetup(res.setup);
        return;
      }
      if (res.error || res.upgrade) {
        setParseError(
          res.error ?? pullWarning ?? "That didn't go through — try again."
        );
        return;
      }
      const data = res.data;
      const hasUsableData =
        !!data &&
        PARSE_KEYS.some((key) =>
          typeof data[key] === "string" ? !!data[key]?.trim() : false
        );
      if (!data || !hasUsableData) {
        setParseError(
          pullWarning ??
            "No verifiable public details came back. Check that the URL is the right public profile."
        );
        return;
      }
      setForm((f) => {
        const next = { ...f };
        for (const k of PARSE_KEYS) {
          const raw = data[k];
          const v = typeof raw === "string" ? raw.trim() : "";
          if (!v) continue;
          // Only accept industries from our fixed vocabulary.
          if (k === "industry" && !INDUSTRIES.some((i) => i.value === v)) {
            continue;
          }
          if (!next[k].trim()) next[k] = v;
        }
        if (pulled.photoUrl?.trim()) next.photo_url = pulled.photoUrl.trim();
        return next;
      });
      setParseDone(true);
    });
  }

  function goNext() {
    const name = form.name.trim();
    if (!name) {
      setError(
        mode === "linkedin" && !isEdit
          ? "LinkedIn didn't provide a verified name — type it in and you're set."
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
    <Field label="Name *">
      <Input
        value={form.name}
        onChange={set("name")}
        placeholder="Jordan Lee"
        autoFocus={isEdit || mode === "scratch"}
      />
    </Field>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
    >
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

          {mode === "linkedin" ? (
            <>
              <Field label="Their LinkedIn URL">
                <div className="flex items-center gap-2">
                  <Input
                    value={form.linkedin_url}
                    onChange={set("linkedin_url")}
                    placeholder="https://linkedin.com/in/..."
                    autoFocus={!isEdit}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={runParse}
                    disabled={parsePending || !form.linkedin_url.trim()}
                    className="shrink-0"
                  >
                    {parsePending ? (
                      <Spinner />
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" /> Pull profile
                      </>
                    )}
                  </Button>
                </div>
              </Field>
              <div className="space-y-2 rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-brand-900/80">
                  <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                  Pull everything public
                </p>
                <p className="text-xs leading-relaxed text-zinc-500">
                  One click reads the public profile, fills every contact field
                  it can verify, and uses the profile photo from that same link.
                </p>
                {parseDone && !parsePending && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600">
                    {form.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.photo_url}
                        alt="Pulled LinkedIn profile"
                        className="h-8 w-8 rounded-lg object-cover"
                      />
                    )}
                    Filled what LinkedIn exposed — give it a once-over.
                  </div>
                )}
                {parseSetup && (
                  <div className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-xs leading-relaxed text-brand-700">
                    <span className="font-medium">
                      AI isn&apos;t set up yet — one quick step:
                    </span>{" "}
                    {parseSetup}
                  </div>
                )}
                {parseError && (
                  <p className="text-xs text-rose-600">{parseError}</p>
                )}
              </div>
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
                <Field label="Phone">
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={set("phone")}
                    placeholder="(555) 123-4567"
                  />
                </Field>
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
              <Field label="Phone">
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="(555) 123-4567"
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
            <div className="sm:col-span-2">
              <Field
                label="Relationship"
                hint="One line on who they are / what they do."
              >
                <Input
                  value={form.relationship}
                  onChange={set("relationship")}
                  placeholder="Second-year IB analyst, my club's alum mentor..."
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
          {form.photo_url && (
            <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.photo_url}
                alt="LinkedIn profile"
                className="h-10 w-10 rounded-xl object-cover"
              />
              <div>
                <p className="text-xs font-medium text-brand-900">Profile photo</p>
                <p className="text-xs text-zinc-500">Pulled from the LinkedIn URL.</p>
              </div>
            </div>
          )}
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
          {/* Both footer buttons submit; the form action routes step 1 to
              goNext (so Enter advances too). Distinct keys make React swap
              DOM nodes between steps instead of mutating one button's type
              mid-click, which used to fire a phantom submit that saved a
              half-filled contact. */}
          {step === 1 ? (
            <Button key="next" type="submit">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button key="save" type="submit" disabled={pending}>
              {pending ? <Spinner /> : isEdit ? "Save changes" : "Add contact"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
