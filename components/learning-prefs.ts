"use client";

// Per-device learning preferences: how deep explanations default to.
// "terms"  -> key-term hover pop-ups (simple blurb vs full detail)
// "worked" -> worked examples ("Keep it simple" vs "The real deal")
// Stored in localStorage; a custom event keeps every mounted component in sync.

import { useEffect, useState } from "react";

export type Depth = "simple" | "detailed";
export type PrefKey = "terms" | "worked";

const STORAGE_PREFIX = "me2ib-depth-";
const EVENT = "me2ib-learning-prefs";

export function readPref(key: PrefKey): Depth {
  try {
    return localStorage.getItem(STORAGE_PREFIX + key) === "detailed"
      ? "detailed"
      : "simple";
  } catch {
    return "simple";
  }
}

export function writePref(key: PrefKey, value: Depth) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, value);
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Hydration-safe: returns "simple" until mounted, then the stored value. */
export function useLearningPref(key: PrefKey): [Depth, (v: Depth) => void] {
  const [value, setValue] = useState<Depth>("simple");

  useEffect(() => {
    const sync = () => setValue(readPref(key));
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [key]);

  return [value, (v: Depth) => writePref(key, v)];
}
