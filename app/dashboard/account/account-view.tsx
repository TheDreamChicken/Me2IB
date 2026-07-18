"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  CircleUserRound,
  Crown,
  ShieldCheck,
  GraduationCap,
  Heart,
  LogOut,
  Mail,
  ImagePlus,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { Profile } from "@/lib/types";
import { INDUSTRIES, STANDINGS } from "@/lib/constants";
import { normalizeTier, TIER_INFO } from "@/lib/tiers";
import { setProfileAvatar, updateProfile } from "@/lib/actions/profile";
import { signout } from "@/lib/actions/auth";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  Badge,
  Button,
  Card,
  cn,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  Textarea,
} from "@/components/ui";
import { PlansSection } from "./plans-section";
import { AiEngineCard } from "./ai-engine-card";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const AUTOSAVE_DELAY = 700;

const GPA_ERROR =
  "GPA needs to be a number between 0.00 and 4.00, shown with two decimals — like 3.87.";

type SaveStatus = "idle" | "saving" | "saved" | "error";

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function SectionHeader({
  icon: Icon,
  title,
  sub,
}: {
  icon: React.ElementType;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div className="rounded-xl bg-brand-100 p-2 text-brand-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-semibold text-brand-900">{title}</h2>
        {sub && <p className="text-xs text-zinc-500">{sub}</p>}
      </div>
    </div>
  );
}

function IndustryChip({
  value,
  label,
  defaultChecked,
}: {
  value: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="checkbox"
        name="target_industries"
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="inline-flex items-center rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50 peer-checked:border-brand-600 peer-checked:bg-brand-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-300">
        {label}
      </span>
    </label>
  );
}

/**
 * Dynamic list of inputs submitted as repeated form fields (getAll on the
 * server). Not wrapped in <Field> — multiple inputs inside one <label> is
 * invalid HTML.
 */
function ListField({
  label,
  name,
  values,
  onChange,
  placeholder,
  addLabel,
}: {
  label: string;
  name: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  addLabel: string;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-brand-900/70">
        {label}
      </span>
      <div className="space-y-2">
        {values.map((value, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              name={name}
              value={value}
              placeholder={i === 0 ? placeholder : "Another one…"}
              aria-label={`${label} ${i + 1}`}
              onChange={(e) =>
                onChange(values.map((v, j) => (j === i ? e.target.value : v)))
              }
              className="flex-1"
            />
            <button
              type="button"
              aria-label={`Remove ${label.toLowerCase()} ${i + 1}`}
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange([...values, ""])}
        className="mt-1.5"
      >
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function AccountView({
  profile,
  userId,
  email,
  memberSince,
  aiModel,
  hasAnthropicKey,
  hasOpenAIKey,
}: {
  profile: Profile | null;
  userId: string;
  email: string | null;
  memberSince: string | null;
  aiModel: string | null;
  hasAnthropicKey: boolean;
  hasOpenAIKey: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [gpaError, setGpaError] = useState<string | null>(null);
  const [, startSaveTransition] = useTransition();
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarPending, startAvatarTransition] = useTransition();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Autosave plumbing lives in refs so timers and flags survive re-renders.
  // Saves deliberately bypass the form's action prop: React 19 resets every
  // uncontrolled field after a form action completes, which would wipe edits
  // typed while a save was in flight.
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const queuedRef = useRef<FormData | null>(null);
  const dirtyRef = useRef(false);
  // Synchronous mirror of gpaError: the GPA input's blur handler sets it just
  // before the form-level blur handler decides whether to schedule a save.
  const gpaInvalidRef = useRef(false);

  useEffect(() => {
    // Capture the form element while mounted: FormData still works on the
    // detached subtree, and formRef.current may be nulled before cleanup runs.
    const formEl = formRef.current;
    return () => {
      const hadPendingSave = debounceRef.current !== null || dirtyRef.current;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (fadeRef.current) clearTimeout(fadeRef.current);
      // Flush instead of drop: an edit made just before navigating away
      // still saves (fire-and-forget — "autosaves as you go" is a promise).
      if (hadPendingSave && formEl && !gpaInvalidRef.current) {
        void updateProfile(new FormData(formEl));
      }
    };
  }, []);

  // Dynamic study lists — prefill from the array columns, fall back to the
  // legacy single major/minor columns for older profiles.
  const [majors, setMajors] = useState<string[]>(() =>
    profile?.majors?.length
      ? profile.majors
      : profile?.major
        ? [profile.major]
        : [""]
  );
  const [minors, setMinors] = useState<string[]>(() =>
    profile?.minors?.length
      ? profile.minors
      : profile?.minor
        ? [profile.minor]
        : []
  );
  const [certificates, setCertificates] = useState<string[]>(
    () => profile?.certificates ?? []
  );

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear + i);
  if (profile?.grad_year && !years.includes(profile.grad_year)) {
    years.unshift(profile.grad_year);
  }

  // Older profiles may have stored things like "3.8 / 4.0" — pull out the
  // first number for the input so re-saving doesn't trip validation.
  const gpaDefault = profile?.gpa
    ? (String(profile.gpa).match(/\d+(\.\d+)?/)?.[0] ?? "")
    : "";

  const currentTier = normalizeTier(profile?.tier);
  const tierInfo = TIER_INFO[currentTier];

  function uploadAvatar(file: File | null) {
    if (!file) return;
    setAvatarError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Choose an image under 5 MB.");
      return;
    }
    startAvatarTransition(async () => {
      const supabase = createBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(`${userId}/avatar`, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });
      if (uploadError) {
        setAvatarError(
          uploadError.message.toLowerCase().includes("bucket")
            ? "Avatar storage is not ready yet — re-run supabase/schema.sql, then try again."
            : uploadError.message
        );
        return;
      }
      const result = await setProfileAvatar(true);
      if (result.error) {
        setAvatarError(result.error);
        return;
      }
      setAvatarUrl(result.avatarUrl ?? null);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      router.refresh();
    });
  }

  function removeAvatar() {
    setAvatarError(null);
    startAvatarTransition(async () => {
      const result = await setProfileAvatar(false);
      if (result.error) {
        setAvatarError(result.error);
        return;
      }
      setAvatarUrl(null);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      router.refresh();
    });
  }

  function runSave(formData: FormData) {
    if (inFlightRef.current) {
      // A save is mid-flight — hold only the freshest snapshot for after.
      queuedRef.current = formData;
      return;
    }
    inFlightRef.current = true;
    if (fadeRef.current) {
      clearTimeout(fadeRef.current);
      fadeRef.current = null;
    }
    setSaveError(null);
    setStatus("saving");
    startSaveTransition(async () => {
      const res = await updateProfile(formData);
      inFlightRef.current = false;
      if (queuedRef.current) {
        const next = queuedRef.current;
        queuedRef.current = null;
        runSave(next);
        return;
      }
      if (res.error) {
        setSaveError(res.error);
        setStatus("error");
      } else {
        setStatus("saved");
        fadeRef.current = setTimeout(() => {
          setStatus("idle");
          fadeRef.current = null;
        }, 2500);
      }
    });
  }

  function saveNow() {
    if (gpaInvalidRef.current || !formRef.current) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    dirtyRef.current = false;
    runSave(new FormData(formRef.current));
  }

  function scheduleAutosave() {
    if (gpaInvalidRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      if (gpaInvalidRef.current || !formRef.current) return;
      dirtyRef.current = false;
      runSave(new FormData(formRef.current));
    }, AUTOSAVE_DELAY);
  }

  /** For the controlled ListFields, whose add/remove clicks fire no form event. */
  function markDirtyAndSchedule() {
    dirtyRef.current = true;
    scheduleAutosave();
  }

  // focusout bubbles, so this catches every field in the form.
  function handleFormBlur() {
    if (dirtyRef.current) scheduleAutosave();
  }

  // Text fields save on blur; toggles and dropdowns commit on change.
  function handleFormChange(e: React.FormEvent<HTMLFormElement>) {
    dirtyRef.current = true;
    const el = e.target as HTMLElement;
    if (
      el instanceof HTMLSelectElement ||
      (el instanceof HTMLInputElement && el.type === "checkbox")
    ) {
      scheduleAutosave();
    }
  }

  function handleGpaBlur(e: React.FocusEvent<HTMLInputElement>) {
    const raw = e.target.value.trim();
    if (raw === "") {
      e.target.value = "";
      gpaInvalidRef.current = false;
      setGpaError(null);
      return;
    }
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0 && n <= 4) {
      // Mirror the server rule so the tidied value shows up right away.
      e.target.value = n.toFixed(2);
      gpaInvalidRef.current = false;
      setGpaError(null);
    } else {
      gpaInvalidRef.current = true;
      setGpaError(GPA_ERROR);
    }
  }

  return (
    <div>
      <PageHeader
        title="Account"
        description="This is you, on paper. Your plan, your materials, and the future AI features all pull from here — fill in what you've got, come back for the rest."
      />

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          saveNow();
        }}
        onBlur={handleFormBlur}
        onChange={handleFormChange}
        className="space-y-4"
      >
        {/* ---------------------------- Basics ---------------------------- */}
        <Card className="p-5 sm:p-6">
          <SectionHeader
            icon={GraduationCap}
            title="Basics"
            sub="The quick facts — name, school, timeline. Nothing scary."
          />
          <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-200 text-2xl font-semibold text-brand-800">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Your profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                (profile?.full_name || email || "?").charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-brand-900">Profile photo</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Shown in the bottom-left account icon throughout the dashboard.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    event.stopPropagation();
                    uploadAvatar(event.target.files?.[0] ?? null);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={avatarPending}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {avatarPending ? <Spinner /> : <ImagePlus className="h-3.5 w-3.5" />}
                  {avatarUrl ? "Replace photo" : "Upload photo"}
                </Button>
                {avatarUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={avatarPending}
                    onClick={removeAvatar}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                )}
              </div>
              {avatarError && (
                <p className="mt-2 text-xs font-medium text-rose-600">
                  {avatarError}
                </p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Full name">
              <Input
                name="full_name"
                placeholder="Jordan Smith"
                defaultValue={profile?.full_name ?? ""}
              />
            </Field>
            <Field label="School">
              <Input
                name="school"
                placeholder="e.g. University of Michigan"
                defaultValue={profile?.school ?? ""}
              />
            </Field>
            <Field label="Standing">
              <Select name="standing" defaultValue={profile?.standing ?? ""}>
                <option value="">Where are you at?</option>
                {STANDINGS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Graduation month">
              <Select
                name="grad_month"
                defaultValue={profile?.grad_month ? String(profile.grad_month) : ""}
              >
                <option value="">Month…</option>
                {MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Graduation year">
              <Select
                name="grad_year"
                defaultValue={profile?.grad_year ? String(profile.grad_year) : ""}
              >
                <option value="">Year…</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="GPA"
              hint={gpaError ? undefined : "We'll tidy it to two decimals for you."}
            >
              <div>
                <div className="flex items-center gap-2">
                  <Input
                    name="gpa"
                    placeholder="3.87"
                    inputMode="decimal"
                    defaultValue={gpaDefault}
                    onBlur={handleGpaBlur}
                    className={cn(
                      "flex-1",
                      gpaError &&
                        "border-rose-300! focus:border-rose-300! focus:ring-rose-200!"
                    )}
                  />
                  <span className="shrink-0 text-sm font-medium text-zinc-400">
                    / 4.00
                  </span>
                </div>
                {gpaError && (
                  <span className="mt-1 block text-xs text-rose-600">
                    {gpaError}
                  </span>
                )}
              </div>
            </Field>
            <Field label="Location">
              <Input
                name="city"
                placeholder="e.g. Ann Arbor, MI"
                defaultValue={profile?.city ?? ""}
              />
            </Field>
            <Field label="Phone">
              <Input
                name="phone"
                placeholder="(555) 123-4567"
                defaultValue={profile?.phone ?? ""}
              />
            </Field>
            <Field label="LinkedIn URL">
              <Input
                name="linkedin_url"
                placeholder="https://linkedin.com/in/..."
                defaultValue={profile?.linkedin_url ?? ""}
              />
            </Field>
          </div>

          {/* What you're studying — dynamic lists, double majors welcome */}
          <div className="mt-5 grid gap-4 border-t border-brand-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">
            <ListField
              label="Majors"
              name="majors"
              values={majors}
              onChange={(next) => {
                setMajors(next);
                markDirtyAndSchedule();
              }}
              placeholder="e.g. Economics"
              addLabel="add another major"
            />
            <ListField
              label="Minors"
              name="minors"
              values={minors}
              onChange={(next) => {
                setMinors(next);
                markDirtyAndSchedule();
              }}
              placeholder="e.g. Computer Science"
              addLabel="add a minor"
            />
            <ListField
              label="Certificates"
              name="certificates"
              values={certificates}
              onChange={(next) => {
                setCertificates(next);
                markDirtyAndSchedule();
              }}
              placeholder="e.g. Financial Economics"
              addLabel="add a certificate"
            />
          </div>
        </Card>

        {/* ------------------------- Professional -------------------------- */}
        <Card className="p-5 sm:p-6">
          <SectionHeader
            icon={Briefcase}
            title="Professional"
            sub="Where you're headed and what you've been up to so far."
          />
          <div className="space-y-4">
            {/* Not a <Field>: chips are labels themselves; nesting labels is invalid */}
            <div>
              <span className="mb-1 block text-xs font-medium text-brand-900/70">
                Target industries
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {INDUSTRIES.map((i) => (
                  <IndustryChip
                    key={i.value}
                    value={i.value}
                    label={i.label}
                    defaultChecked={
                      profile?.target_industries?.includes(i.value) ?? false
                    }
                  />
                ))}
              </div>
              <span className="mt-1 block text-xs text-zinc-400">
                Pick all that you&apos;re recruiting for — you can always change
                your mind.
              </span>
            </div>
            <Field
              label="Clubs & activities"
              hint="One per line — add your role if you have one."
            >
              <Textarea
                name="clubs"
                placeholder={
                  "Finance club — analyst\nClub tennis\nStudent government"
                }
                defaultValue={profile?.clubs ?? ""}
              />
            </Field>
            <Field
              label="Professional summary"
              hint="A short blurb about your experience — think elevator pitch, not autobiography."
            >
              <Textarea
                name="professional_summary"
                placeholder="Sophomore studying econ with a summer of wealth management shadowing; strong Excel, learning financial modeling..."
                defaultValue={profile?.professional_summary ?? ""}
              />
            </Field>
          </div>
        </Card>

        {/* ---------------------- Personal attributes ---------------------- */}
        <Card className="p-5 sm:p-6">
          <SectionHeader
            icon={Heart}
            title="Personal attributes"
            sub="Please don't make these all corporate. Pickup soccer, lactose intolerance, chess hustling — the random human stuff is what interviewers actually remember and connect with. It's what makes you you."
          />
          <div className="space-y-4">
            <Field
              label="Personal interests"
              hint="One per line — short and punchy."
            >
              <Textarea
                name="personal_interests"
                placeholder={
                  "Pickup soccer\nLactose intolerance\nDie-hard Bears fan"
                }
                defaultValue={profile?.personal_interests ?? ""}
              />
            </Field>
            <Field
              label="Fun facts"
              hint="One per line — make it random, make it special."
            >
              <Textarea
                name="fun_facts"
                placeholder={
                  "Backpacked through 6 countries\nOnce met Warren Buffett\nCan solve a Rubik's cube"
                }
                defaultValue={profile?.fun_facts ?? ""}
              />
            </Field>
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {status === "idle" && (
            <span className="text-xs text-zinc-400">Autosaves as you go</span>
          )}
          {status === "saving" && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <Spinner className="h-3.5 w-3.5" /> Saving…
            </span>
          )}
          {status === "saved" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          {status === "error" && saveError && (
            <span className="text-xs font-medium text-rose-600">
              Couldn&apos;t save — {saveError}
            </span>
          )}
          <Button
            type="submit"
            disabled={status === "saving" || gpaError !== null}
          >
            {status === "saving" ? <Spinner /> : "Save profile"}
          </Button>
        </div>
      </form>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* --------------------------- Your plan --------------------------- */}
        <Card className="p-5 sm:p-6">
          <SectionHeader
            icon={Crown}
            title="Your plan"
            sub="Where your subscription stands."
          />
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className={tierInfo.badgeClass}>{tierInfo.label}</Badge>
              {profile?.is_admin && (
                <Badge className="bg-amber-100 text-amber-700">
                  <ShieldCheck className="h-3 w-3" /> Admin
                </Badge>
              )}
            </div>
            <p className="text-sm text-zinc-500">{tierInfo.tagline}</p>
            <a
              href="#plans"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
            >
              See plans <ArrowDown className="h-3.5 w-3.5" />
            </a>
          </div>
        </Card>

        {/* ---------------------------- Account ---------------------------- */}
        <Card className="p-5 sm:p-6">
          <SectionHeader
            icon={CircleUserRound}
            title="Account"
            sub="Your login stuff."
          />
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              <div className="min-w-0">
                <p className="text-xs text-zinc-400">Email</p>
                <p className="break-words text-sm text-brand-900">
                  {email ?? "—"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              <div>
                <p className="text-xs text-zinc-400">Member since</p>
                <p className="text-sm text-brand-900">
                  {memberSince
                    ? new Date(memberSince).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        // Date-only display: pin to UTC so server and every
                        // viewer timezone render the same day.
                        timeZone: "UTC",
                      })
                    : "—"}
                </p>
              </div>
            </div>
            <form action={signout} className="border-t border-brand-100 pt-4">
              <Button type="submit" variant="danger">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </form>
          </div>
        </Card>

        {/* Existing outreach drafts already match profile + contact context. */}
        <Card className="bg-brand-50 p-5 sm:p-6">
          <div className="flex h-full flex-col items-start gap-3">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-brand-100 p-2 text-brand-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="font-semibold text-brand-900">
                AI common-ground matching
              </h2>
            </div>
            <p className="text-sm text-zinc-500">
              Outreach drafts already cross-reference your interests, fun
              facts, and each contact&apos;s details to suggest openers that land.
            </p>
            <Link
              href="/dashboard/contacts"
              className="mt-auto inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
            >
              <Sparkles className="h-3.5 w-3.5" /> Draft from a contact
            </Link>
          </div>
        </Card>
      </div>

      <PlansSection currentTier={currentTier} isAdmin={!!profile?.is_admin} />

      {/* Owner-only: which model powers every AI feature. The server action
          and the app_settings RLS policy both re-check is_admin. */}
      {profile?.is_admin && (
        <AiEngineCard
          currentModel={aiModel}
          hasAnthropicKey={hasAnthropicKey}
          hasOpenAIKey={hasOpenAIKey}
        />
      )}
    </div>
  );
}
