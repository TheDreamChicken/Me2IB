"use client";

import { useEffect, useRef, useState } from "react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  hasSanePhotoDimensions,
  photoDimensions,
  sniffPhotoType,
} from "./linkedin/photo-validation";

const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

async function removePhotoDraft(path: string | null): Promise<void> {
  if (!path) return;
  try {
    const supabase = createBrowserClient();
    const { error } = await supabase.storage.from("avatars").remove([path]);
    if (error) {
      console.error("Could not clean up contact photo draft:", error.message);
    }
  } catch (error) {
    console.error(
      "Could not clean up contact photo draft:",
      error instanceof Error ? error.message : "Unknown storage error"
    );
  }
}

function ownManualPhotoPath(urlValue: string, userId: string): string | null {
  try {
    const url = new URL(urlValue);
    const marker = "/storage/v1/object/public/avatars/";
    const index = url.pathname.indexOf(marker);
    if (index < 0) return null;
    const path = decodeURIComponent(url.pathname.slice(index + marker.length));
    const prefix = `${userId}/contacts/manual-`;
    const objectId = path.startsWith(prefix) ? path.slice(prefix.length) : "";
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      objectId
    )
      ? path
      : null;
  } catch {
    return null;
  }
}

export function useContactPhotoUpload({
  userId,
  initialUrl,
  onUrlChange,
}: {
  userId: string;
  initialUrl: string;
  onUrlChange: (url: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftPathRef = useRef<string | null>(null);
  const committedRef = useRef(false);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const initialPathRef = useRef(ownManualPhotoPath(initialUrl, userId));
  const submittedPathRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      if (!committedRef.current) void removePhotoDraft(draftPathRef.current);
    };
  }, []);

  async function upload(file: File): Promise<void> {
    setError(null);
    if (!PHOTO_TYPES.has(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (!file.size) {
      setError("That image file is empty — choose another one.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Choose an image under 5 MB.");
      return;
    }
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await file.arrayBuffer());
    } catch {
      setError("That image could not be read — choose another one.");
      return;
    }
    const fileType = sniffPhotoType(bytes);
    if (
      fileType !== file.type ||
      !hasSanePhotoDimensions(photoDimensions(bytes, fileType))
    ) {
      setError("That file does not appear to be a valid JPG, PNG, or WebP image.");
      return;
    }

    const requestId = ++requestIdRef.current;
    const path = `${userId}/contacts/manual-${crypto.randomUUID()}`;
    setPending(true);
    try {
      const supabase = createBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          upsert: false,
          contentType: file.type,
          cacheControl: "86400",
          metadata: { source: "manual" },
        });

      if (!mountedRef.current || requestIdRef.current !== requestId) {
        if (!uploadError) void removePhotoDraft(path);
        return;
      }
      setPending(false);
      if (uploadError) {
        setError(
          uploadError.message.toLowerCase().includes("bucket")
            ? "Photo storage is not ready yet — re-run supabase/schema.sql, then try again."
            : uploadError.message
        );
        return;
      }

      const previousPath = draftPathRef.current;
      draftPathRef.current = path;
      if (previousPath) void removePhotoDraft(previousPath);
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = new URL(data.publicUrl);
      url.searchParams.set("v", String(Date.now()));
      url.searchParams.set("source", "manual");
      onUrlChange(url.toString());
    } catch (caught) {
      if (!mountedRef.current || requestIdRef.current !== requestId) return;
      setPending(false);
      setError(caught instanceof Error ? caught.message : "Could not upload photo.");
    }
  }

  function remove(): void {
    requestIdRef.current += 1;
    setPending(false);
    setError(null);
    const path = draftPathRef.current;
    draftPathRef.current = null;
    void removePhotoDraft(path);
    onUrlChange("");
  }

  function prepareSubmit(photoUrl: string): void {
    committedRef.current = true;
    submittedPathRef.current = ownManualPhotoPath(photoUrl, userId);
  }

  function saveFailed(): void {
    committedRef.current = false;
    submittedPathRef.current = null;
    if (!mountedRef.current) {
      const path = draftPathRef.current;
      draftPathRef.current = null;
      void removePhotoDraft(path);
    }
  }

  function saveSucceeded(): void {
    committedRef.current = true;
    const savedPath = submittedPathRef.current;
    if (initialPathRef.current !== savedPath) {
      void removePhotoDraft(initialPathRef.current);
    }
    if (draftPathRef.current !== savedPath) {
      void removePhotoDraft(draftPathRef.current);
    }
    draftPathRef.current = savedPath;
    submittedPathRef.current = null;
  }

  function saveUncertain(): void {
    // A thrown server-action response can be lost after the DB commit. Keep the
    // submitted object so an already-saved contact never points at a deleted
    // photo; at worst, this preserves one harmless draft for manual cleanup.
    committedRef.current = true;
    submittedPathRef.current = null;
  }

  function discard(): void {
    if (committedRef.current) return;
    requestIdRef.current += 1;
    const path = draftPathRef.current;
    draftPathRef.current = null;
    void removePhotoDraft(path);
  }

  return {
    discard,
    error,
    pending,
    prepareSubmit,
    remove,
    saveFailed,
    saveSucceeded,
    saveUncertain,
    upload,
  };
}
