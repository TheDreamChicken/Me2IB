"use client";

import { useState, useTransition } from "react";
import type { CalendarEvent } from "@/lib/types";
import { EVENT_TYPES } from "@/lib/constants";
import { upsertEvent } from "@/lib/actions/events";
import {
  Button,
  Field,
  Input,
  Select,
  Spinner,
  Textarea,
} from "@/components/ui";
import {
  addDaysKey,
  dateKeyOf,
  normalizedEventType,
  timeOf,
  todayKey,
  type ApplicationLite,
  type ContactLite,
} from "./calendar-utils";

export function EventForm({
  event,
  defaultDate,
  contacts,
  applications,
  onDone,
}: {
  event: CalendarEvent | null;
  /** yyyy-mm-dd prefill when adding from a day cell. */
  defaultDate?: string;
  contacts: ContactLite[];
  applications: ApplicationLite[];
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [allDay, setAllDay] = useState(event?.all_day ?? false);
  // Legacy rows may have a location without a location_type — treat those as
  // in-person so the saved location stays visible (and editable) on edit.
  const [locationType, setLocationType] = useState(
    event?.location_type ?? (event?.location ? "in_person" : "")
  );

  const start = event ? new Date(event.start_at) : null;
  const end = event?.end_at ? new Date(event.end_at) : null;
  // All-day events live at UTC midnight — read the date off the ISO string.
  const defDate = event
    ? event.all_day
      ? event.start_at.slice(0, 10)
      : dateKeyOf(new Date(event.start_at))
    : (defaultDate ?? todayKey());
  const defStartTime = start && !event?.all_day ? timeOf(start) : "";
  const defEndTime = end && !event?.all_day ? timeOf(end) : "";

  function submit(formData: FormData) {
    const date = String(formData.get("date") ?? "");
    if (!date) {
      setError("Pick a date.");
      return;
    }
    const startTime = String(formData.get("start_time") ?? "");
    const endTime = String(formData.get("end_time") ?? "");
    const useTimes = !allDay && startTime !== "";
    if (allDay) {
      // All-day events are stored at UTC midnight so every timezone sees
      // them on the same calendar day.
      formData.set("start_at", new Date(`${date}T00:00:00Z`).toISOString());
      formData.set("end_at", "");
    } else {
      // Compose ISO timestamps in the user's local timezone.
      formData.set(
        "start_at",
        new Date(`${date}T${useTimes ? startTime : "00:00"}`).toISOString()
      );
      // An end time at or before the start time means the event runs
      // overnight — roll the end over to the next day.
      const endDate =
        useTimes && endTime && endTime <= startTime ? addDaysKey(date, 1) : date;
      formData.set(
        "end_at",
        useTimes && endTime ? new Date(`${endDate}T${endTime}`).toISOString() : ""
      );
    }

    startTransition(async () => {
      const res = await upsertEvent(formData);
      if (res.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
      className="space-y-4"
    >
      {event && <input type="hidden" name="id" value={event.id} />}
      <input type="hidden" name="source" value={event?.source ?? "manual"} />

      <Field label="Title *">
        <Input
          name="title"
          defaultValue={event?.title}
          required
          autoFocus
          placeholder="Coffee chat with an analyst, superday prep..."
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Event type">
          <Select
            name="event_type"
            defaultValue={
              event ? normalizedEventType(event.event_type) : "coffee_chat"
            }
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date *">
          <Input name="date" type="date" defaultValue={defDate} required />
        </Field>
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-1.5 text-xs text-zinc-500">
        <input
          type="checkbox"
          name="all_day"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          className="accent-brand-600"
        />
        All day
      </label>

      {!allDay && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start time">
            <Input name="start_time" type="time" defaultValue={defStartTime} />
          </Field>
          <Field label="End time">
            <Input name="end_time" type="time" defaultValue={defEndTime} />
          </Field>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Linked contact">
          <Select name="contact_id" defaultValue={event?.contact_id ?? ""}>
            <option value="">—</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.company ? ` — ${c.company}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Linked application">
          <Select name="application_id" defaultValue={event?.application_id ?? ""}>
            <option value="">—</option>
            {applications.map((a) => (
              <option key={a.id} value={a.id}>
                {a.company}
                {a.position ? ` — ${a.position}` : ""}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Where">
          <Select
            name="location_type"
            value={locationType}
            onChange={(e) => setLocationType(e.target.value)}
          >
            <option value="">—</option>
            <option value="virtual">Virtual</option>
            <option value="in_person">In person</option>
          </Select>
        </Field>
        {locationType === "virtual" && (
          <Field label="Meeting link">
            <Input
              name="meeting_link"
              type="url"
              defaultValue={event?.meeting_link ?? ""}
              placeholder="https://zoom.us/j/..."
            />
          </Field>
        )}
        {locationType === "in_person" && (
          <Field label="Location">
            <Input
              name="location"
              defaultValue={event?.location ?? ""}
              placeholder="Campus café, firm HQ..."
            />
          </Field>
        )}
      </div>

      <Field label="Description">
        <Textarea name="description" defaultValue={event?.description ?? ""} />
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
          {pending ? <Spinner /> : event ? "Save changes" : "Add event"}
        </Button>
      </div>
    </form>
  );
}
