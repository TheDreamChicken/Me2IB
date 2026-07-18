"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, PenLine, Sparkles } from "lucide-react";
import { LinkedInIcon } from "@/components/icons";
import type { Contact } from "@/lib/types";
import { CONNECTION_STRENGTHS, INDUSTRIES } from "@/lib/constants";
import { upsertContact } from "@/lib/actions/contacts";
import {
  useLinkedInImport,
  type FormState,
} from "./use-linkedin-import";
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

  const initialForm: FormState = {
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
  };

  const {
    cancelImport,
    form,
    handleFieldChange,
    importedPhotoFailed,
    parseDone,
    parseError,
    parseNotice,
    parsePending,
    parseSetup,
    runParse,
  } = useLinkedInImport(initialForm);

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
    if (parsePending) return;
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
        onChange={(e) => handleFieldChange("name", e.target.value)}
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
                onClick={() => {
                  if (mode !== "linkedin") cancelImport();
                  setMode("linkedin");
                }}
                icon={<LinkedInIcon className="h-4 w-4" />}
                title="Start with LinkedIn"
                sub="Paste their profile link"
              />
              <StartOption
                active={mode === "scratch"}
                onClick={() => {
                  cancelImport();
                  setMode("scratch");
                }}
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
                    onChange={(e) =>
                      handleFieldChange("linkedin_url", e.target.value)
                    }
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
                        referrerPolicy="no-referrer"
                        onError={() => importedPhotoFailed(form.photo_url)}
                      />
                    )}
                    Public-profile check finished — give the details a once-over.
                  </div>
                )}
                {parseNotice && !parsePending && (
                  <p className="text-xs leading-relaxed text-amber-700">
                    {parseNotice}
                  </p>
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
                  <Input
                    value={form.company}
                    onChange={(e) =>
                      handleFieldChange("company", e.target.value)
                    }
                  />
                </Field>
                <Field label="Position">
                  <Input
                    value={form.position}
                    onChange={(e) =>
                      handleFieldChange("position", e.target.value)
                    }
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      handleFieldChange("email", e.target.value)
                    }
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      handleFieldChange("phone", e.target.value)
                    }
                    placeholder="(555) 123-4567"
                  />
                </Field>
              </div>
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">{nameField}</div>
              <Field label="Company">
                <Input
                  value={form.company}
                  onChange={(e) =>
                    handleFieldChange("company", e.target.value)
                  }
                />
              </Field>
              <Field label="Position">
                <Input
                  value={form.position}
                  onChange={(e) =>
                    handleFieldChange("position", e.target.value)
                  }
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    handleFieldChange("email", e.target.value)
                  }
                />
              </Field>
              <Field label="Phone">
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    handleFieldChange("phone", e.target.value)
                  }
                  placeholder="(555) 123-4567"
                />
              </Field>
              <Field label="LinkedIn URL">
                <Input
                  value={form.linkedin_url}
                  onChange={(e) =>
                    handleFieldChange("linkedin_url", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleFieldChange("how_met", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleFieldChange("relationship", e.target.value)
                  }
                  placeholder="Second-year IB analyst, my club's alum mentor..."
                />
              </Field>
            </div>
            <Field label="Connection strength">
              <Select
                value={form.connection_strength}
                onChange={(e) =>
                  handleFieldChange("connection_strength", e.target.value)
                }
              >
                {CONNECTION_STRENGTHS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.value} — {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Industry">
              <Select
                value={form.industry}
                onChange={(e) =>
                  handleFieldChange("industry", e.target.value)
                }
              >
                <option value="">—</option>
                {INDUSTRIES.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Location">
              <Input
                value={form.location}
                onChange={(e) =>
                  handleFieldChange("location", e.target.value)
                }
              />
            </Field>
            <Field label="School / alma mater">
              <Input
                value={form.alma_mater}
                onChange={(e) =>
                  handleFieldChange("alma_mater", e.target.value)
                }
              />
            </Field>
            <Field label="Last contacted">
              <Input
                type="date"
                value={form.last_contacted}
                onChange={(e) =>
                  handleFieldChange("last_contacted", e.target.value)
                }
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
                onChange={(e) =>
                  handleFieldChange("followup_interval_days", e.target.value)
                }
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) => handleFieldChange("status", e.target.value)}
              >
                <option value="active">Active — keep warm</option>
                <option value="warm">Warm — occasional touch</option>
                <option value="dormant">Dormant</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
            <Field label="Tags" hint="Comma-separated, e.g. alumni, IB, mentor">
              <Input
                value={form.tags}
                onChange={(e) => handleFieldChange("tags", e.target.value)}
              />
            </Field>
          </div>
          <Field
            label="Shared interests"
            hint="Common ground makes outreach 10x easier."
          >
            <Textarea
              value={form.shared_interests}
              onChange={(e) =>
                handleFieldChange("shared_interests", e.target.value)
              }
              placeholder="Both play tennis, both from Chicago, same fraternity..."
            />
          </Field>
          <Field label="Notes">
            <Textarea
              value={form.notes}
              onChange={(e) => handleFieldChange("notes", e.target.value)}
            />
          </Field>
          {form.photo_url && (
            <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.photo_url}
                alt="LinkedIn profile"
                className="h-10 w-10 rounded-xl object-cover"
                referrerPolicy="no-referrer"
                onError={() => importedPhotoFailed(form.photo_url)}
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
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              cancelImport();
              onDone();
            }}
          >
            Cancel
          </Button>
          {/* Both footer buttons submit; the form action routes step 1 to
              goNext (so Enter advances too). Distinct keys make React swap
              DOM nodes between steps instead of mutating one button's type
              mid-click, which used to fire a phantom submit that saved a
              half-filled contact. */}
          {step === 1 ? (
            <Button key="next" type="submit" disabled={parsePending}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button key="save" type="submit" disabled={pending || parsePending}>
              {pending ? <Spinner /> : isEdit ? "Save changes" : "Add contact"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
