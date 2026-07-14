"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarEvent } from "@/lib/types";
import { Button, Card, cn } from "@/components/ui";
import { buildMonthCells, todayKey, typeColor } from "./calendar-utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_PILLS = 3;

export function MonthGrid({
  eventsByDay,
  onDayClick,
  onEventClick,
  onMoreClick,
}: {
  eventsByDay: Map<string, CalendarEvent[]>;
  onDayClick: (key: string) => void;
  onEventClick: (id: string) => void;
  onMoreClick: (key: string) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const cells = useMemo(
    () => buildMonthCells(cursor.year, cursor.month),
    [cursor]
  );
  const today = todayKey();
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" }
  );

  function shift(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function goToday() {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
  }

  return (
    <Card className="p-4">
      {/* Controls */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-brand-900">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => shift(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => shift(1)}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-1 text-center text-xs font-medium text-zinc-400"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const dayEvents = eventsByDay.get(cell.key) ?? [];
          const extra = dayEvents.length - MAX_PILLS;
          const isToday = cell.key === today;
          return (
            <div
              key={cell.key}
              role="button"
              onClick={() => onDayClick(cell.key)}
              title={`Add event on ${cell.key}`}
              className={cn(
                "flex min-h-16 cursor-pointer flex-col gap-0.5 rounded-xl border border-transparent p-1 transition-colors hover:border-brand-200 hover:bg-brand-50 sm:min-h-20",
                !cell.inMonth && "opacity-40",
                isToday && "ring-2 ring-brand-400"
              )}
            >
              <span
                className={cn(
                  "px-1 text-xs font-medium",
                  isToday
                    ? "text-brand-700"
                    : cell.inMonth
                      ? "text-brand-900"
                      : "text-zinc-400"
                )}
              >
                {cell.day}
              </span>
              {dayEvents.slice(0, MAX_PILLS).map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onEventClick(e.id);
                  }}
                  title={e.title}
                  className={cn(
                    "cursor-pointer truncate rounded-md border px-1 py-px text-left text-[10px] font-medium leading-4 transition-opacity hover:opacity-80",
                    typeColor(e.event_type),
                    e.completed && "line-through opacity-60"
                  )}
                >
                  {e.title}
                </button>
              ))}
              {extra > 0 && (
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onMoreClick(cell.key);
                  }}
                  className="cursor-pointer px-1 text-left text-[10px] font-medium text-brand-500 hover:text-brand-700"
                >
                  +{extra} more
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
