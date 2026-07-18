"use client";

import { useMemo, useState, useTransition } from "react";
import Markdown from "react-markdown";
import {
  AlarmClock,
  Building2,
  CheckCircle2,
  GraduationCap,
  Heart,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons";
import type { Contact, Profile } from "@/lib/types";
import {
  CONNECTION_STRENGTHS,
  INDUSTRIES,
  companyLogoUrl,
  labelFor,
} from "@/lib/constants";
import { daysSinceTouch, followupDelta, isOverdue } from "@/lib/contact-utils";
import { localDateKey, useNow } from "@/components/use-today";
import { deleteContact, markContacted } from "@/lib/actions/contacts";
import { callAI } from "@/lib/ai-client";
import { TierGate } from "@/components/tier-gate";
import { PreferenceDeleteButton as DeleteButton } from "@/app/dashboard/settings/delete-button";
import { ContactForm } from "./contact-form";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  Spinner,
  StatCard,
  cn,
} from "@/components/ui";

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function Avatar({ contact, size = "md" }: { contact: Contact; size?: "md" | "lg" }) {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const initials = contact.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const cls =
    size === "lg"
      ? "h-16 w-16 text-xl rounded-2xl"
      : "h-10 w-10 text-sm rounded-xl";
  return contact.photo_url && contact.photo_url !== failedPhotoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={contact.photo_url}
      alt={contact.name}
      className={cn(cls, "shrink-0 object-cover")}
      referrerPolicy="no-referrer"
      onError={() => setFailedPhotoUrl(contact.photo_url)}
    />
  ) : (
    <div
      className={cn(
        cls,
        "flex shrink-0 items-center justify-center bg-brand-200 font-semibold text-brand-800"
      )}
    >
      {initials}
    </div>
  );
}

function StrengthDots({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      title={`Connection: ${
        CONNECTION_STRENGTHS.find((s) => s.value === value)?.label ?? value
      }`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            i <= value ? "bg-brand-500" : "bg-brand-100"
          )}
        />
      ))}
    </span>
  );
}

function TouchBadge({ contact, now }: { contact: Contact; now: Date | null }) {
  if (contact.status === "archived") {
    return <Badge className="bg-zinc-100 text-zinc-500">Archived</Badge>;
  }
  // Day counts depend on the viewer's clock/timezone — render a neutral
  // placeholder until mounted so SSR HTML never disagrees with the client.
  if (!now) {
    return (
      <Badge className="bg-zinc-100 text-zinc-400">
        <AlarmClock className="h-3 w-3" />
        &hellip;
      </Badge>
    );
  }
  const delta = followupDelta(contact);
  const days = daysSinceTouch(contact);
  if (delta >= 0) {
    return (
      <Badge className="bg-rose-50 text-rose-600">
        <AlarmClock className="h-3 w-3" />
        {contact.last_contacted ? `${days}d since last touch` : "Never contacted"}
      </Badge>
    );
  }
  if (delta >= -5) {
    return (
      <Badge className="bg-amber-50 text-amber-600">
        <AlarmClock className="h-3 w-3" />
        Follow up in {-delta}d
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-50 text-emerald-600">
      <CheckCircle2 className="h-3 w-3" />
      In touch
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* AI outreach drafts                                                  */
/* ------------------------------------------------------------------ */

function OutreachSection({
  contact,
  profile,
}: {
  contact: Contact;
  profile: Profile | null;
}) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<string | null>(null);
  const [setup, setSetup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    setSetup(null);
    startTransition(async () => {
      const res = await callAI("outreach", { contact, profile });
      if (res.setup) {
        setSetup(res.setup);
        return;
      }
      if (res.upgrade) {
        // The TierGate should catch this first — belt and suspenders.
        setError(
          res.error ??
            `This needs the ${res.upgrade.neededLabel} plan — upgrade in Account → Plan.`
        );
        return;
      }
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.text) setDraft(res.text);
      else setError("No draft came back — try again.");
    });
  }

  const firstName = contact.name.split(/\s+/)[0];

  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-brand-900">
          <Sparkles className="h-4 w-4 text-brand-500" /> AI outreach drafts
        </p>
        <Button
          size="sm"
          variant={draft ? "secondary" : "primary"}
          onClick={generate}
          disabled={pending}
        >
          {pending ? (
            <Spinner />
          ) : draft ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" /> Draft again
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" /> Draft outreach
            </>
          )}
        </Button>
      </div>
      {!draft && !setup && (
        <p className="mt-1 text-xs text-zinc-500">
          Ready-to-send emails built from {firstName}&apos;s details and your
          shared ground.
        </p>
      )}
      {setup && (
        <div className="mt-3 rounded-xl border border-brand-200 bg-white px-3 py-2 text-xs leading-relaxed text-brand-700">
          <span className="font-medium">
            AI isn&apos;t set up yet — one quick step:
          </span>{" "}
          {setup}
        </div>
      )}
      {error && (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}
      {draft && (
        <div className="prose-cozy mt-3 rounded-xl bg-white p-4 text-sm">
          <Markdown>{draft}</Markdown>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail card popup                                                   */
/* ------------------------------------------------------------------ */

function ContactDetail({
  contact,
  profile,
  now,
  onEdit,
  onClose,
}: {
  contact: Contact;
  profile: Profile | null;
  now: Date | null;
  onEdit: () => void;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const logo = companyLogoUrl(contact.company);

  const infoRows: { icon: React.ElementType; label: string; value: string | null }[] = [
    { icon: Building2, label: "Company", value: contact.company },
    { icon: MapPin, label: "Location", value: contact.location },
    { icon: GraduationCap, label: "School", value: contact.alma_mater },
    { icon: Mail, label: "Email", value: contact.email },
    { icon: Phone, label: "Phone", value: contact.phone },
    { icon: Users, label: "How you met", value: contact.how_met },
    { icon: Heart, label: "Shared interests", value: contact.shared_interests },
  ];

  return (
    <div className="space-y-5">
      {/* Header block */}
      <div className="flex items-start gap-4 rounded-2xl bg-gradient-to-br from-brand-100 via-brand-50 to-white p-5">
        <Avatar contact={contact} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-brand-900">{contact.name}</h3>
          <p className="flex items-center gap-1.5 text-sm text-zinc-500">
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="h-4 w-4 rounded" />
            )}
            {[contact.position, contact.company].filter(Boolean).join(" @ ") ||
              "No role saved yet"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StrengthDots value={contact.connection_strength} />
            <TouchBadge contact={contact} now={now} />
            {contact.industry && (
              <Badge>{labelFor(INDUSTRIES, contact.industry)}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {contact.linkedin_url && (
          <a
            href={contact.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-50"
          >
            <LinkedInIcon className="h-3.5 w-3.5" /> LinkedIn
          </a>
        )}
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-50"
          >
            <Mail className="h-3.5 w-3.5" /> Email
          </a>
        )}
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await markContacted(
                contact.id,
                localDateKey(new Date())
              );
              setError(res.error ?? null);
            })
          }
        >
          {pending ? <Spinner /> : "I reached out today"}
        </Button>
      </div>

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      {/* Info grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {infoRows
          .filter((r) => r.value)
          .map((r) => (
            <div key={r.label} className="flex items-start gap-2.5">
              <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              <div className="min-w-0">
                <p className="text-xs text-zinc-400">{r.label}</p>
                <p className="break-words text-sm text-brand-900">{r.value}</p>
              </div>
            </div>
          ))}
      </div>

      {/* AI outreach (heat tier) — drafts are ephemeral, not persisted. */}
      <TierGate
        feature="ai_outreach"
        title="AI outreach drafts"
        blurb="Ready-to-send emails tailored to this contact and your shared ground."
        variant="card"
      >
        <OutreachSection contact={contact} profile={profile} />
      </TierGate>

      {contact.relationship && (
        <div className="rounded-xl bg-brand-50 p-4 text-sm leading-relaxed text-brand-900">
          {contact.relationship}
        </div>
      )}
      {contact.notes && (
        <div>
          <p className="mb-1 text-xs font-medium text-zinc-400">Notes</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
            {contact.notes}
          </p>
        </div>
      )}
      {contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {contact.tags.map((t) => (
            <Badge key={t} className="bg-brand-50 text-brand-600">
              #{t}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-brand-100 pt-4">
        <DeleteButton
          onConfirm={() => {
            startTransition(async () => {
              const res = await deleteContact(contact.id);
              if (res.error) setError(res.error);
              else onClose();
            });
          }}
        />
        <Button onClick={onEdit}>Edit contact</Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function ContactsView({
  contacts,
  profile,
}: {
  contacts: Contact[];
  profile: Profile | null;
}) {
  const now = useNow();
  const [query, setQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [sort, setSort] = useState<"recent" | "name" | "stale">("recent");
  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Keep the detail modal in sync with fresh server data after actions.
  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    let list = contacts;
    if (!showArchived) list = list.filter((c) => c.status !== "archived");
    if (industryFilter) list = list.filter((c) => c.industry === industryFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) =>
        [c.name, c.company, c.position, c.notes, c.how_met, ...(c.tags ?? [])]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q))
      );
    }
    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "stale") sorted.sort((a, b) => followupDelta(b) - followupDelta(a));
    return sorted;
  }, [contacts, query, industryFilter, sort, showArchived]);

  const active = contacts.filter((c) => c.status !== "archived");
  const overdueCount = active.filter(isOverdue).length;
  const strongCount = active.filter((c) => c.connection_strength >= 4).length;

  return (
    <div>
      <PageHeader
        title="Contacts"
        description="Every coffee chat, cold email, and friendly analyst lives here. Jot people down as you meet them — we'll nudge you before anyone goes quiet."
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add contact
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="People in your corner"
          value={active.length}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Overdue follow-ups"
          value={now ? overdueCount : "—"}
          sub={
            now
              ? overdueCount
                ? "Don't let them go cold!"
                : "All caught up 🎉"
              : undefined
          }
          icon={<AlarmClock className="h-5 w-5" />}
        />
        <StatCard
          label="Strong connections"
          value={strongCount}
          sub="Strength 4+"
          icon={<Heart className="h-5 w-5" />}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          placeholder="Search name, company, tags..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-64"
        />
        <Select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="w-auto"
        >
          <option value="">All industries</option>
          {INDUSTRIES.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </Select>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="w-auto"
        >
          <option value="recent">Recently added</option>
          <option value="name">Name A–Z</option>
          <option value="stale">Needs attention first</option>
        </Select>
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-zinc-500">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="accent-brand-600"
          />
          Show archived
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title={contacts.length === 0 ? "No contacts yet" : "No matches"}
          hint={
            contacts.length === 0
              ? "Add the first person in your network — an alum, a club upperclassman, anyone."
              : "Try a different search or filter."
          }
          action={
            contacts.length === 0 ? (
              <Button onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" /> Add your first contact
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const logo = companyLogoUrl(c.company);
            return (
              <Card
                key={c.id}
                className="p-4"
                onClick={() => setSelectedId(c.id)}
              >
                <div className="flex items-start gap-3">
                  <Avatar contact={c} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-brand-900">
                      {c.name}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-zinc-500">
                      {logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logo} alt="" className="h-3.5 w-3.5 rounded" />
                      )}
                      {[c.position, c.company].filter(Boolean).join(" @ ") || "—"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <StrengthDots value={c.connection_strength} />
                      <TouchBadge contact={c} now={now} />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add */}
      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add someone new"
      >
        {adding && <ContactForm contact={null} onDone={() => setAdding(false)} />}
      </Modal>

      {/* Detail + edit share one persistent overlay so switching views never
          tears down the modal backdrop (which caused a white flash). */}
      <Modal
        open={!!selected}
        onClose={() => {
          if (editing) setEditing(null);
          else setSelectedId(null);
        }}
        title={editing ? "Edit contact" : ""}
        wide={!editing}
      >
        {editing ? (
          <ContactForm
            key={editing.id}
            contact={editing}
            onDone={() => setEditing(null)}
          />
        ) : selected ? (
          <ContactDetail
            contact={selected}
            profile={profile}
            now={now}
            onClose={() => setSelectedId(null)}
            onEdit={() => setEditing(selected)}
          />
        ) : null}
      </Modal>
    </div>
  );
}
