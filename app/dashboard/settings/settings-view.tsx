"use client";

import { useEffect, useState } from "react";
import { Check, Palette } from "lucide-react";
import { Card, PageHeader, cn } from "@/components/ui";

// Ordered as light/dark pairs — each light theme has a darker sibling.
const THEMES = [
  {
    value: "lavender",
    label: "Lavender",
    hint: "The classic — soft purple on white.",
    swatches: ["#f6f1ff", "#9a71f6", "#4e2c90"],
  },
  {
    value: "dark",
    label: "Midnight",
    hint: "Lavender's night owl — charcoal & deep purple.",
    swatches: ["#0f0d14", "#7c5ce0", "#ece8f4"],
  },
  {
    value: "blue",
    label: "Ocean",
    hint: "Calm blues with a white fade.",
    swatches: ["#eff5ff", "#5f8df6", "#233a90"],
  },
  {
    value: "deep",
    label: "Deep End",
    hint: "Ocean after dark — late-night navy.",
    swatches: ["#0a0f1c", "#3f6ee0", "#e6ecf7"],
  },
  {
    value: "sage",
    label: "Sage",
    hint: "Earthy greens, easy on the eyes.",
    swatches: ["#f1f6ee", "#6a9a5c", "#2b4227"],
  },
  {
    value: "forest",
    label: "Forest",
    hint: "Sage at midnight — mossy and cozy.",
    swatches: ["#0e130f", "#4f8a55", "#e6efe4"],
  },
] as const;

export function SettingsView() {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || "lavender");
  }, []);

  function pick(value: string) {
    setTheme(value);
    if (value === "lavender") {
      delete document.documentElement.dataset.theme;
      try {
        localStorage.removeItem("me2ib-theme");
      } catch {}
    } else {
      document.documentElement.dataset.theme = value;
      try {
        localStorage.setItem("me2ib-theme", value);
      } catch {}
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Make it yours. More knobs and dials coming soon."
      />

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-xl bg-brand-100 p-2 text-brand-600">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-brand-900">Theme</h2>
            <p className="text-sm text-zinc-500">
              Picks apply instantly and stick on this device.
            </p>
          </div>
        </div>

        {/* Two columns so each row is a light theme + its darker sibling */}
        <div className="grid gap-3 sm:grid-cols-2">
          {THEMES.map((t) => {
            const active = theme === t.value;
            return (
              <button
                key={t.value}
                onClick={() => pick(t.value)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-all cursor-pointer",
                  active
                    ? "border-brand-500 ring-2 ring-brand-300"
                    : "border-brand-100 hover:border-brand-300"
                )}
              >
                <div className="mb-3 flex gap-1.5">
                  {t.swatches.map((c) => (
                    <span
                      key={c}
                      className="h-6 w-6 rounded-full border border-black/10"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <p className="flex items-center gap-1.5 font-medium text-brand-900">
                  {t.label}
                  {active && <Check className="h-4 w-4 text-brand-600" />}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">{t.hint}</p>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
