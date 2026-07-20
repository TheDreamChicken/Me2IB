import { createHash } from "node:crypto";
import type { createClient } from "@/lib/supabase/server";
import type { ValidatedPhoto } from "./photo-pipeline";

const STORED_PHOTO_TTL_MS = 24 * 60 * 60_000;

export type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
export type PhotoSource = "linkedin" | "unavatar";

export type StoredPhoto = {
  fresh: boolean;
  source: PhotoSource;
  url: string;
};

function profilePhotoPath(userId: string, profile: URL): string {
  const profileHash = createHash("sha256")
    .update(profile.toString())
    .digest("hex")
    .slice(0, 40);
  return `${userId}/contacts/linkedin-${profileHash}`;
}

function publicPhotoUrl(
  supabase: SupabaseClient,
  path: string,
  source: PhotoSource,
  versionSeed: string
): string {
  const version = createHash("sha256")
    .update(versionSeed)
    .digest("hex")
    .slice(0, 16);
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = new URL(data.publicUrl);
  url.searchParams.set("v", version);
  url.searchParams.set("source", source);
  return url.toString();
}

export async function persistPhoto(
  supabase: SupabaseClient,
  userId: string,
  profile: URL,
  photo: ValidatedPhoto,
  source: PhotoSource
): Promise<string | null> {
  const path = profilePhotoPath(userId, profile);
  const contentHash = createHash("sha256").update(photo.bytes).digest("hex");
  try {
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, photo.bytes, {
        upsert: true,
        contentType: photo.contentType,
        cacheControl: "86400",
        metadata: { source },
      });
    if (error) {
      console.error("Could not persist LinkedIn profile photo:", error.message);
      return null;
    }
    return publicPhotoUrl(supabase, path, source, contentHash);
  } catch (error) {
    console.error(
      "Could not persist LinkedIn profile photo:",
      error instanceof Error ? error.message : "Unknown storage error"
    );
    return null;
  }
}

export async function storedPhoto(
  supabase: SupabaseClient,
  userId: string,
  profile: URL
): Promise<StoredPhoto | null> {
  const path = profilePhotoPath(userId, profile);
  try {
    const { data, error } = await supabase.storage.from("avatars").info(path);
    if (error || !data) return null;
    const source: PhotoSource =
      data.metadata?.source === "unavatar" ? "unavatar" : "linkedin";
    const modified = Date.parse(data.lastModified ?? data.updatedAt ?? "");
    const versionSeed =
      data.etag ?? data.version ?? (Number.isFinite(modified) ? String(modified) : path);
    return {
      fresh:
        Number.isFinite(modified) && Date.now() - modified < STORED_PHOTO_TTL_MS,
      source,
      url: publicPhotoUrl(supabase, path, source, versionSeed),
    };
  } catch {
    return null;
  }
}
