"use client";

import { useEffect, useState } from "react";
import { Check, GraduationCap, Palette, Trash2 } from "lucide-react";
import { Card, PageHeader, cn } from "@/components/ui";
import { useLearningPref, type PrefKey } from "@/components/learning-prefs";
import { DELETE_CONFIRMATION_KEY } from "./delete-button";

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
    hint: "Sage at dawn — mossy and cozy.",
    swatches: ["#0e130f", "#4f8a55", "#e6efe4"],
  },
] as const;

function currentTheme(): string {
  return document.documentElement.dataset.theme || "lavender";
}

function confirmationEnabled(): boolean {
  try {
    return localStorage.getItem(DELETE_CONFIRMATION_KEY) !== "false";
  } catch {
    return true;
  }
}

function applyTheme(value: string) {
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

export function SettingsView() {
  const [theme, setTheme] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => {
      setTheme(currentTheme());
      setConfirmDelete(confirmationEnabled());
    }, 0);
    return () => clearTimeout(id);
  }, []);

  function pick(value: string) {
    setTheme(value);
    applyTheme(value);
  }

  function toggleDeleteConfirmation() {
    setConfirmDelete((current) => {
      const next = !current;
      try {
        localStorage.setItem(DELETE_CONFIRMATION_KEY, String(next));
      } catch {}
      return next;
    });
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
              Selections apply instantly and stick on this device.
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

      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-xl bg-brand-100 p-2 text-brand-600">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-brand-900">Learning depth</h2>
            <p className="text-sm text-zinc-500">
              How deep explanations go by default in Practice — mix and match
              however your brain likes it.
            </p>
          </div>
        </div>

        <div className="divide-y divide-brand-100">
          <DepthRow
            prefKey="terms"
            title="Key term pop-ups"
            description="The little blurbs that appear when you hover a finance or consulting term."
            offLabel="Simple"
            onLabel="Detailed"
          />
          <DepthRow
            prefKey="worked"
            title="Worked examples"
            description="Which version opens first inside practice answers."
            offLabel="Keep it simple"
            onLabel="The real deal"
          />
        </div>
      </Card>

      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-xl bg-brand-100 p-2 text-brand-600">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-brand-900">Delete confirmation</h2>
            <p className="text-sm text-zinc-500">
              Choose whether destructive buttons need a second click.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-center">
          <div>
            <p className="font-medium text-brand-900">Confirm again to delete</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Applies to contacts, applications, events, documents, experiences,
              opportunities, and stories on this device.
            </p>
          </div>
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2.5 sm:w-52">
            <span
              className={cn(
                "text-right text-xs font-medium transition-colors",
                confirmDelete ? "text-zinc-400" : "text-brand-800"
              )}
            >
              Off
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={confirmDelete}
              aria-label="Confirm again to delete"
              onClick={toggleDeleteConfirmation}
              className={cn(
                "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
                confirmDelete ? "bg-brand-600" : "bg-brand-200"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                  confirmDelete && "translate-x-5"
                )}
              />
            </button>
            <span
              className={cn(
                "text-left text-xs font-medium transition-colors",
                confirmDelete ? "text-brand-800" : "text-zinc-400"
              )}
            >
              On
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DepthRow({
  prefKey,
  title,
  description,
  offLabel,
  onLabel,
}: {
  prefKey: PrefKey;
  title: string;
  description: string;
  offLabel: string;
  onLabel: string;
}) {
  const [depth, setDepth] = useLearningPref(prefKey);
  const detailed = depth === "detailed";
  return (
    <div className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-center">
      <div className="min-w-0">
        <p className="font-medium text-brand-900">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
      </div>
      <div className="grid w-full shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2.5 sm:w-52">
        <span
          className={cn(
            "text-right text-xs font-medium transition-colors",
            detailed ? "text-zinc-400" : "text-brand-800"
          )}
        >
          {offLabel}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={detailed}
          aria-label={`${title}: ${detailed ? onLabel : offLabel}`}
          onClick={() => setDepth(detailed ? "simple" : "detailed")}
          className={cn(
            "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
            detailed ? "bg-brand-600" : "bg-brand-200"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
              detailed && "translate-x-5"
            )}
          />
        </button>
        <span
          className={cn(
            "text-left text-xs font-medium transition-colors",
            detailed ? "text-brand-800" : "text-zinc-400"
          )}
        >
          {onLabel}
        </span>
      </div>
    </div>
  );
}
