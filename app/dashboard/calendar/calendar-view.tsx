"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDays, Clock, Lightbulb, Plus } from "lucide-react";
import type { CalendarEvent } from "@/lib/types";
import { EVENT_TYPES, labelFor } from "@/lib/constants";
import { toggleEventComplete, upsertEvent } from "@/lib/actions/events";
import {
  Badge,
  Button,
  Card,
  Modal,
  PageHeader,
  StatCard,
  cn,
} from "@/components/ui";
import {
  addDaysKey,
  buildSuggestions,
  eventDayKey,
  formatDayKey,
  formatEventTime,
  todayKey,
  typeColor,
  type ApplicationLite,
  type ContactLite,
  type Suggestion,
} from "./calendar-utils";
import { MonthGrid } from "./month-grid";
import { EventForm } from "./event-form";
import { EventDetail } from "./event-detail";
import { AiEventsPlaceholder, SuggestionsPanel } from "./suggestions";

/* ------------------------------------------------------------------ */
/* Event row (upcoming list + day modal)                               */
/* ------------------------------------------------------------------ */

function EventRow({
  event,
  contact,
  application,
  showDate = true,
  toggling,
  onOpen,
  onToggle,
}: {
  event: CalendarEvent;
  contact: ContactLite | null;
  application: ApplicationLite | null;
  showDate?: boolean;
  toggling: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const meta = [
    showDate
      ? eventDayKey(event) === todayKey()
        ? "Today"
        : formatDayKey(eventDayKey(event))
      : null,
    formatEventTime(event) ?? "All day",
    contact?.name ?? null,
    application?.company ?? null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      onClick={onOpen}
      className="flex cursor-pointer items-center gap-3 rounded-xl border border-brand-100 bg-white p-3 transition-colors hover:border-brand-300"
    >
      <input
        type="checkbox"
        checked={event.completed}
        disabled={toggling}
        onClick={(e) => e.stopPropagation()}
        onChange={onToggle}
        className="h-4 w-4 shrink-0 cursor-pointer accent-brand-600"
        aria-label={`Mark "${event.title}" ${event.completed ? "incomplete" : "complete"}`}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium text-brand-900",
            event.completed && "text-zinc-400 line-through"
          )}
        >
          {event.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-zinc-400">{meta}</p>
      </div>
      <Badge className={cn("shrink-0", typeColor(event.event_type))}>
        {labelFor(EVENT_TYPES, event.event_type)}
      </Badge>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function CalendarView({
  events,
  contacts,
  applications,
}: {
  events: CalendarEvent[];
  contacts: ContactLite[];
  applications: ApplicationLite[];
}) {
  const [addDate, setAddDate] = useState<string | null>(null);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Keep the detail modal in sync with fresh server data after actions.
  const selected = events.find((e) => e.id === selectedId) ?? null;

  const contactById = useMemo(
    () => new Map(contacts.map((c) => [c.id, c])),
    [contacts]
  );
  const applicationById = useMemo(
    () => new Map(applications.map((a) => [a.id, a])),
    [applications]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const k = eventDayKey(e);
      const list = map.get(k);
      if (list) list.push(e);
      else map.set(k, [e]);
    }
    return map;
  }, [events]);

  const upcoming = useMemo(() => {
    const start = todayKey();
    const end = addDaysKey(start, 14);
    return events.filter((e) => {
      const k = eventDayKey(e);
      return k >= start && k < end;
    });
  }, [events]);

  const suggestions = useMemo(
    () => buildSuggestions(events, contacts, applications),
    [events, contacts, applications]
  );

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthCount = events.filter((e) =>
    eventDayKey(e).startsWith(monthPrefix)
  ).length;
  const openUpcoming = upcoming.filter((e) => !e.completed).length;

  function contactFor(e: CalendarEvent) {
    return e.contact_id ? (contactById.get(e.contact_id) ?? null) : null;
  }
  function applicationFor(e: CalendarEvent) {
    return e.application_id
      ? (applicationById.get(e.application_id) ?? null)
      : null;
  }

  function toggle(e: CalendarEvent) {
    setTogglingId(e.id);
    startTransition(async () => {
      await toggleEventComplete(e.id, !e.completed);
      setTogglingId(null);
    });
  }

  function addSuggestion(s: Suggestion) {
    setPendingKey(s.key);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", s.title);
      fd.set("event_type", s.event_type);
      fd.set("start_at", new Date(`${s.date}T00:00:00`).toISOString());
      fd.set("all_day", "true");
      fd.set("source", "smart");
      if (s.contact_id) fd.set("contact_id", s.contact_id);
      if (s.application_id) fd.set("application_id", s.application_id);
      await upsertEvent(fd);
      setPendingKey(null);
    });
  }

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Every deadline, interview, and coffee chat in one cozy schedule."
        action={
          <Button onClick={() => setAddDate(todayKey())}>
            <Plus className="h-4 w-4" /> Add event
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Events this month"
          value={thisMonthCount}
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <StatCard
          label="Next 14 days"
          value={openUpcoming}
          sub={openUpcoming ? "Still to do" : "Clear runway ahead"}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="Smart suggestions"
          value={suggestions.length}
          sub={suggestions.length ? "Waiting for a slot" : "All caught up 🎉"}
          icon={<Lightbulb className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        {/* Left: calendar + upcoming */}
        <div className="min-w-0 space-y-6">
          <MonthGrid
            eventsByDay={eventsByDay}
            onDayClick={setAddDate}
            onEventClick={setSelectedId}
            onMoreClick={setDayKey}
          />

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-900">
                Upcoming — next 14 days
              </h2>
              <span className="text-xs text-zinc-400">
                {upcoming.length} event{upcoming.length === 1 ? "" : "s"}
              </span>
            </div>
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-brand-200 bg-brand-50/50 p-6 text-center">
                <CalendarDays className="h-8 w-8 text-brand-300" />
                <p className="text-sm font-medium text-brand-900">
                  Nothing scheduled yet
                </p>
                <p className="max-w-sm text-xs text-zinc-400">
                  Click a day on the calendar or add a smart suggestion to fill
                  your next two weeks.
                </p>
                <Button size="sm" className="mt-1" onClick={() => setAddDate(todayKey())}>
                  <Plus className="h-4 w-4" /> Add event
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((e) => (
                  <EventRow
                    key={e.id}
                    event={e}
                    contact={contactFor(e)}
                    application={applicationFor(e)}
                    toggling={togglingId === e.id}
                    onOpen={() => setSelectedId(e.id)}
                    onToggle={() => toggle(e)}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right: smart suggestions + AI placeholder */}
        <div className="space-y-6">
          <SuggestionsPanel
            suggestions={suggestions}
            pendingKey={pendingKey}
            onAdd={addSuggestion}
          />
          <AiEventsPlaceholder />
        </div>
      </div>

      {/* Add */}
      <Modal
        open={!!addDate}
        onClose={() => setAddDate(null)}
        title="Add event"
      >
        {addDate && (
          <EventForm
            event={null}
            defaultDate={addDate}
            contacts={contacts}
            applications={applications}
            onDone={() => setAddDate(null)}
          />
        )}
      </Modal>

      {/* Edit */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit event"
      >
        {editing && (
          <EventForm
            event={editing}
            contacts={contacts}
            applications={applications}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>

      {/* Detail */}
      <Modal
        open={!!selected && !editing}
        onClose={() => setSelectedId(null)}
        title=""
      >
        {selected && (
          <EventDetail
            event={selected}
            contact={contactFor(selected)}
            application={applicationFor(selected)}
            onClose={() => setSelectedId(null)}
            onEdit={() => setEditing(selected)}
          />
        )}
      </Modal>

      {/* Day list ("+N more") */}
      <Modal
        open={!!dayKey}
        onClose={() => setDayKey(null)}
        title={
          dayKey
            ? formatDayKey(dayKey, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })
            : ""
        }
      >
        {dayKey && (
          <div className="space-y-2">
            {(eventsByDay.get(dayKey) ?? []).map((e) => (
              <EventRow
                key={e.id}
                event={e}
                contact={contactFor(e)}
                application={applicationFor(e)}
                showDate={false}
                toggling={togglingId === e.id}
                onOpen={() => {
                  setDayKey(null);
                  setSelectedId(e.id);
                }}
                onToggle={() => toggle(e)}
              />
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
