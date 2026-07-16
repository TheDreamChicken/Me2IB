"use client";

import { useState, useTransition } from "react";
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  CircleUserRound,
  Crown,
  GraduationCap,
  Heart,
  LogOut,
  Mail,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import type { Profile } from "@/lib/types";
import { INDUSTRIES, STANDINGS, TIER_LEVELS } from "@/lib/constants";
import { updateProfile } from "@/lib/actions/profile";
import { signout } from "@/lib/actions/auth";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  Textarea,
} from "@/components/ui";

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
  email,
  memberSince,
}: {
  profile: Profile | null;
  email: string | null;
  memberSince: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

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

  const tier =
    TIER_LEVELS.find((t) => t.value === (profile?.tier ?? "free")) ??
    TIER_LEVELS[0];

  function submit(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateProfile(formData);
      if (res.error) setError(res.error);
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Account"
        description="This is you, on paper. Your plan, your materials, and the future AI features all pull from here — fill in what you've got, come back for the rest."
      />

      <form action={submit} className="space-y-4">
        {/* ---------------------------- Basics ---------------------------- */}
        <Card className="p-5 sm:p-6">
          <SectionHeader
            icon={GraduationCap}
            title="Basics"
            sub="The quick facts — name, school, timeline. Nothing scary."
          />
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
            <Field label="GPA" hint="We'll tidy it to two decimals for you.">
              <div className="flex items-center gap-2">
                <Input
                  name="gpa"
                  placeholder="3.87"
                  inputMode="decimal"
                  defaultValue={gpaDefault}
                  className="flex-1"
                />
                <span className="shrink-0 text-sm font-medium text-zinc-400">
                  / 4.00
                </span>
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
              onChange={setMajors}
              placeholder="e.g. Economics"
              addLabel="add another major"
            />
            <ListField
              label="Minors"
              name="minors"
              values={minors}
              onChange={setMinors}
              placeholder="e.g. Computer Science"
              addLabel="add a minor"
            />
            <ListField
              label="Certificates"
              name="certificates"
              values={certificates}
              onChange={setCertificates}
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
            sub="Please don't make these all corporate. Pickup soccer, sourdough, chess hustling — the random human stuff is what interviewers actually remember and connect with. It's what makes you you."
          />
          <div className="space-y-4">
            <Field
              label="Personal interests"
              hint="One per line — short and punchy."
            >
              <Textarea
                name="personal_interests"
                placeholder={
                  "Pickup soccer\nSourdough baking\nDie-hard Bears fan"
                }
                defaultValue={profile?.personal_interests ?? ""}
              />
            </Field>
            <Field label="Fun facts" hint="One per line — the weirder the better.">
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

        {error && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : "Save profile"}
          </Button>
        </div>
      </form>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* --------------------------- Your plan --------------------------- */}
        <Card className="p-5 sm:p-6">
          <SectionHeader
            icon={Crown}
            title="Your plan"
            sub="No paywalls around here (yet)."
          />
          <div className="space-y-3">
            <Badge className={tier.color}>{tier.label}</Badge>
            <p className="text-sm text-zinc-500">
              {tier.value === "free"
                ? "Free — everything's included right now. Paid tiers come later; early birds will be treated kindly."
                : `You're on ${tier.label} — everything's unlocked. Thanks for backing us early.`}
            </p>
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

        {/* ------------------------- AI placeholder ------------------------ */}
        <Card className="border-dashed bg-brand-50 p-5 sm:p-6">
          <div className="flex h-full flex-col items-start gap-3">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-brand-100 p-2 text-brand-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="font-semibold text-brand-900">
                AI icebreaker matching — coming soon
              </h2>
            </div>
            <p className="text-sm text-zinc-500">
              We&apos;ll cross-reference your interests and fun facts with each
              contact&apos;s to suggest openers that actually land.
            </p>
            <Button variant="secondary" size="sm" disabled className="mt-auto">
              <Sparkles className="h-3.5 w-3.5" /> Coming soon
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
