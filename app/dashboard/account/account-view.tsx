"use client";

import { useState, useTransition } from "react";
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  CircleUserRound,
  GraduationCap,
  Heart,
  LogOut,
  Mail,
  Sparkles,
} from "lucide-react";
import type { Profile } from "@/lib/types";
import { INDUSTRIES, STANDINGS } from "@/lib/constants";
import { updateProfile } from "@/lib/actions/profile";
import { signout } from "@/lib/actions/auth";
import {
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

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear + i);
  if (profile?.grad_year && !years.includes(profile.grad_year)) {
    years.unshift(profile.grad_year);
  }

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
        description="Who you are on paper — the plan, your materials, and future AI features all pull from here."
      />

      <form action={submit} className="space-y-4">
        {/* ---------------------------- Basics ---------------------------- */}
        <Card className="p-5 sm:p-6">
          <SectionHeader
            icon={GraduationCap}
            title="Basics"
            sub="The essentials recruiters (and this app) care about."
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
            <Field label="Major">
              <Input
                name="major"
                placeholder="e.g. Economics"
                defaultValue={profile?.major ?? ""}
              />
            </Field>
            <Field label="Minor">
              <Input
                name="minor"
                placeholder="e.g. Computer Science"
                defaultValue={profile?.minor ?? ""}
              />
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
              label="Standing"
              hint={'Not sure? Pick "Standard student" and we\'ll work it out.'}
            >
              <Select
                name="standing"
                defaultValue={profile?.standing ?? "standard"}
              >
                {STANDINGS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="GPA">
              <Input
                name="gpa"
                placeholder="e.g. 3.8 / 4.0"
                defaultValue={profile?.gpa ?? ""}
              />
            </Field>
            <Field label="City">
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
        </Card>

        {/* ------------------------- Professional -------------------------- */}
        <Card className="p-5 sm:p-6">
          <SectionHeader
            icon={Briefcase}
            title="Professional"
            sub="What you're aiming for and what you've done so far."
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
                Pick all that you&apos;re recruiting for.
              </span>
            </div>
            <Field label="Clubs & activities">
              <Textarea
                name="clubs"
                placeholder="Finance club (analyst), club tennis, student government..."
                defaultValue={profile?.clubs ?? ""}
              />
            </Field>
            <Field
              label="Professional summary"
              hint="A short blurb about your experience — think elevator pitch."
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
            sub="Shared interests are the easiest way to connect — future AI outreach suggestions will use these to find common ground with your contacts."
          />
          <div className="space-y-4">
            <Field
              label="Personal interests"
              hint="Hobbies, sports, hometown, favorite teams — anything you'd chat about."
            >
              <Textarea
                name="personal_interests"
                placeholder="Tennis, skiing, from Chicago, huge Bears fan, love cooking..."
                defaultValue={profile?.personal_interests ?? ""}
              />
            </Field>
            <Field label="Fun facts">
              <Textarea
                name="fun_facts"
                placeholder="Backpacked through 6 countries, once met Warren Buffett, can solve a Rubik's cube..."
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

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* ---------------------------- Account ---------------------------- */}
        <Card className="p-5 sm:p-6">
          <SectionHeader
            icon={CircleUserRound}
            title="Account"
            sub="Your login details."
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
