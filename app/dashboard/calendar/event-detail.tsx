"use client";

import { useTransition } from "react";
import { Briefcase, CheckCircle2, Clock, MapPin, Users } from "lucide-react";
import type { CalendarEvent } from "@/lib/types";
import { EVENT_TYPES, labelFor } from "@/lib/constants";
import { deleteEvent, toggleEventComplete } from "@/lib/actions/events";
import { Badge, Button, DeleteButton, Spinner, cn } from "@/components/ui";
import {
  eventDayKey,
  formatDayKey,
  formatEventTime,
  typeColor,
  type ApplicationLite,
  type ContactLite,
} from "./calendar-utils";

export function EventDetail({
  event,
  contact,
  application,
  onEdit,
  onClose,
}: {
  event: CalendarEvent;
  contact: ContactLite | null;
  application: ApplicationLite | null;
  onEdit: () => void;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const dateLabel = formatDayKey(eventDayKey(event), {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeLabel = formatEventTime(event);

  const infoRows: { icon: React.ElementType; label: string; value: string | null }[] = [
    { icon: MapPin, label: "Location", value: event.location },
    {
      icon: Users,
      label: "Contact",
      value: contact
        ? [contact.name, contact.company].filter(Boolean).join(" — ")
        : null,
    },
    {
      icon: Briefcase,
      label: "Application",
      value: application
        ? [application.company, application.position].filter(Boolean).join(" — ")
        : null,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header block */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-100 via-brand-50 to-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={typeColor(event.event_type)}>
            {labelFor(EVENT_TYPES, event.event_type)}
          </Badge>
          {event.source === "smart" && (
            <Badge className="bg-brand-50 text-brand-600">Smart suggestion</Badge>
          )}
          {event.completed && (
            <Badge className="bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-3 w-3" /> Done
            </Badge>
          )}
        </div>
        <h3
          className={cn(
            "mt-2 text-lg font-semibold text-brand-900",
            event.completed && "line-through opacity-70"
          )}
        >
          {event.title}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
          <Clock className="h-4 w-4 shrink-0 text-brand-400" />
          {dateLabel} · {timeLabel ?? "All day"}
        </p>
      </div>

      {/* Info grid */}
      {infoRows.some((r) => r.value) && (
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
      )}

      {event.description && (
        <div className="rounded-xl bg-brand-50 p-4 text-sm leading-relaxed text-brand-900 whitespace-pre-wrap">
          {event.description}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-100 pt-4">
        <DeleteButton
          onConfirm={() => {
            startTransition(async () => {
              await deleteEvent(event.id);
              onClose();
            });
          }}
        />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await toggleEventComplete(event.id, !event.completed);
              })
            }
          >
            {pending ? (
              <Spinner />
            ) : event.completed ? (
              "Mark incomplete"
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Mark complete
              </>
            )}
          </Button>
          <Button onClick={onEdit}>Edit event</Button>
        </div>
      </div>
    </div>
  );
}
