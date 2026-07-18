"use client";

import { useEffect, useState } from "react";

/**
 * Hydration-safe "now". Returns null during SSR and the first client render,
 * then the browser's clock after mount. Gate any today/deadline-dependent UI
 * on this so server-rendered HTML never disagrees with the client.
 */
export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setNow(new Date()), 0);
    return () => clearTimeout(id);
  }, []);
  return now;
}

/** Local calendar date as YYYY-MM-DD (viewer's timezone). */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Whole days from `now` until a YYYY-MM-DD date, in the viewer's timezone. */
export function daysUntilLocal(dateStr: string, now: Date): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
