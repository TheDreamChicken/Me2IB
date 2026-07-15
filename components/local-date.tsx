"use client";

import { useNow } from "@/components/use-today";

/**
 * Viewer-local date/time text, hydration-safe: renders a stable placeholder
 * until mounted, then the value in the browser's timezone. Use these from
 * server components instead of calling toLocaleDateString on the server.
 */

export function LocalDate({
  iso,
  options,
  placeholder = "…",
}: {
  iso: string;
  options?: Intl.DateTimeFormatOptions;
  placeholder?: string;
}) {
  const now = useNow();
  if (!now) return <span suppressHydrationWarning>{placeholder}</span>;
  return (
    <span suppressHydrationWarning>
      {new Date(iso).toLocaleDateString(
        "en-US",
        options ?? { month: "short", day: "numeric" }
      )}
    </span>
  );
}

export function LocalTime({
  iso,
  placeholder = "…",
}: {
  iso: string;
  placeholder?: string;
}) {
  const now = useNow();
  if (!now) return <span suppressHydrationWarning>{placeholder}</span>;
  return (
    <span suppressHydrationWarning>
      {new Date(iso).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })}
    </span>
  );
}
