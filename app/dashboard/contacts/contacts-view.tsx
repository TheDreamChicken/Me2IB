"use client";

import { useMemo, useState, useTransition } from "react";
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
  Users,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons";
import type { Contact } from "@/lib/types";
import {
  CONNECTION_STRENGTHS,
  INDUSTRIES,
  companyLogoUrl,
  labelFor,
} from "@/lib/constants";
import { daysSinceTouch, followupDelta, isOverdue } from "@/lib/contact-utils";
import { localDateKey, useNow } from "@/components/use-today";
import {
  deleteContact,
  markContacted,
  upsertContact,
} from "@/lib/actions/contacts";
import {
  Badge,
  Button,
  Card,
  DeleteButton,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  Spinner,
  StatCard,
  Textarea,
  cn,
} from "@/components/ui";

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function Avatar({ contact, size = "md" }: { contact: Contact; size?: "md" | "lg" }) {
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
  return contact.photo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={contact.photo_url}
      alt={contact.name}
      className={cn(cls, "shrink-0 object-cover")}
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
/* Add / edit form                                                     */
/* ------------------------------------------------------------------ */

function ContactForm({
  contact,
  onDone,
}: {
  contact: Contact | null;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const res = await upsertContact(formData);
      if (res.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <form action={submit} className="space-y-4">
      {contact && <input type="hidden" name="id" value={contact.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *">
          <Input name="name" defaultValue={contact?.name} required autoFocus />
        </Field>
        <Field label="Company">
          <Input name="company" defaultValue={contact?.company ?? ""} />
        </Field>
        <Field label="Position">
          <Input name="position" defaultValue={contact?.position ?? ""} />
        </Field>
        <Field label="Industry">
          <Select name="industry" defaultValue={contact?.industry ?? ""}>
            <option value="">—</option>
            {INDUSTRIES.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Email">
          <Input name="email" type="email" defaultValue={contact?.email ?? ""} />
        </Field>
        <Field label="Phone">
          <Input name="phone" defaultValue={contact?.phone ?? ""} />
        </Field>
        <Field label="LinkedIn URL">
          <Input
            name="linkedin_url"
            placeholder="https://linkedin.com/in/..."
            defaultValue={contact?.linkedin_url ?? ""}
          />
        </Field>
        <Field label="Photo URL" hint="Paste an image link (e.g. from their LinkedIn photo).">
          <Input name="photo_url" defaultValue={contact?.photo_url ?? ""} />
        </Field>
        <Field label="Location">
          <Input name="location" defaultValue={contact?.location ?? ""} />
        </Field>
        <Field label="School / alma mater">
          <Input name="alma_mater" defaultValue={contact?.alma_mater ?? ""} />
        </Field>
        <Field label="How you met / know them">
          <Input
            name="how_met"
            placeholder="Coffee chat via alumni database..."
            defaultValue={contact?.how_met ?? ""}
          />
        </Field>
        <Field label="Connection strength">
          <Select
            name="connection_strength"
            defaultValue={String(contact?.connection_strength ?? 2)}
          >
            {CONNECTION_STRENGTHS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.value} — {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Last contacted">
          <Input
            name="last_contacted"
            type="date"
            defaultValue={contact?.last_contacted ?? ""}
          />
        </Field>
        <Field label="Follow-up cadence (days)" hint="You'll get a nudge when this lapses.">
          <Input
            name="followup_interval_days"
            type="number"
            min={1}
            defaultValue={String(contact?.followup_interval_days ?? 21)}
          />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={contact?.status ?? "active"}>
            <option value="active">Active — keep warm</option>
            <option value="warm">Warm — occasional touch</option>
            <option value="dormant">Dormant</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
        <Field label="Tags" hint="Comma-separated, e.g. alumni, IB, mentor">
          <Input name="tags" defaultValue={contact?.tags?.join(", ") ?? ""} />
        </Field>
      </div>

      <Field label="Who they are / what they do">
        <Textarea
          name="relationship"
          placeholder="VP in Healthcare coverage, super friendly, offered to intro me to analysts..."
          defaultValue={contact?.relationship ?? ""}
        />
      </Field>
      <Field label="Shared interests" hint="Common ground makes outreach 10x easier.">
        <Textarea
          name="shared_interests"
          placeholder="Both play tennis, both from Chicago, same fraternity..."
          defaultValue={contact?.shared_interests ?? ""}
        />
      </Field>
      <Field label="Notes">
        <Textarea name="notes" defaultValue={contact?.notes ?? ""} />
      </Field>

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : contact ? "Save changes" : "Add contact"}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Detail card popup                                                   */
/* ------------------------------------------------------------------ */

function ContactDetail({
  contact,
  now,
  onEdit,
  onClose,
}: {
  contact: Contact;
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

export function ContactsView({ contacts }: { contacts: Contact[] }) {
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
        description="Your network is your net worth. Keep every connection warm."
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
      <Modal open={adding} onClose={() => setAdding(false)} title="Add contact" wide>
        <ContactForm contact={null} onDone={() => setAdding(false)} />
      </Modal>

      {/* Edit */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit contact"
        wide
      >
        {editing && (
          <ContactForm contact={editing} onDone={() => setEditing(null)} />
        )}
      </Modal>

      {/* Detail */}
      <Modal
        open={!!selected && !editing}
        onClose={() => setSelectedId(null)}
        title=""
        wide
      >
        {selected && (
          <ContactDetail
            contact={selected}
            now={now}
            onClose={() => setSelectedId(null)}
            onEdit={() => setEditing(selected)}
          />
        )}
      </Modal>
    </div>
  );
}
