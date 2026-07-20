"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button, Spinner, cn } from "@/components/ui";

export function ContactPhotoControl({
  photoUrl,
  pending,
  error,
  compact = false,
  onFile,
  onRemove,
  onImageError,
}: {
  photoUrl: string;
  pending: boolean;
  error: string | null;
  compact?: boolean;
  onFile: (file: File) => Promise<void>;
  onRemove: () => void;
  onImageError: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const visiblePhoto = photoUrl && photoUrl !== failedUrl ? photoUrl : "";

  function choose(file: File | null): void {
    if (!file || pending) return;
    setFailedUrl(null);
    void onFile(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      className="hidden"
      onChange={(event) => choose(event.target.files?.[0] ?? null)}
    />
  );

  if (visiblePhoto) {
    return (
      <div className="space-y-2 rounded-xl bg-brand-50 p-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={visiblePhoto}
            alt="Contact profile"
            className="h-12 w-12 rounded-xl object-cover"
            referrerPolicy="no-referrer"
            onError={() => {
              setFailedUrl(visiblePhoto);
              onImageError(visiblePhoto);
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-brand-900">Profile photo</p>
            <p className="text-xs text-zinc-500">
              Saved to me2IB so it keeps working after LinkedIn links expire.
            </p>
          </div>
          {input}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? <Spinner /> : <ImagePlus className="h-3.5 w-3.5" />}
            Replace
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={onRemove}
            aria-label="Remove profile photo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    );
  }

  return (
    <div
      tabIndex={0}
      onPaste={(event) => {
        const item = [...event.clipboardData.items].find((entry) =>
          entry.type.startsWith("image/")
        );
        if (item) {
          event.preventDefault();
          choose(item.getAsFile());
        }
      }}
      className={cn(
        "rounded-xl border border-dashed border-brand-200 bg-white/70 p-3 focus:outline-none focus:ring-2 focus:ring-brand-300",
        compact ? "mt-2" : ""
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-brand-900">
            {failedUrl ? "That photo did not load" : "No profile photo yet"}
          </p>
          <p className="text-xs text-zinc-500">
            Paste an image into this box, or choose a JPG, PNG, or WebP.
          </p>
        </div>
        {input}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? <Spinner /> : <ImagePlus className="h-3.5 w-3.5" />}
          {pending ? "Saving…" : "Choose photo"}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
