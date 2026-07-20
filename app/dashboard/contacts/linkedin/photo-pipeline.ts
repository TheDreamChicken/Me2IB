import { normalizeLinkedInProfilePhotoUrl } from "./profile-parser";
import {
  validatedPhotoFromResponse,
  type ValidatedPhoto,
} from "./photo-validation";

export {
  MAX_PROFILE_PHOTO_BYTES,
  sniffPhotoType,
  validatedPhotoFromResponse,
} from "./photo-validation";
export type { SupportedPhotoType, ValidatedPhoto } from "./photo-validation";

const MAX_RESOLVER_JSON_BYTES = 32 * 1024;
const MAX_PHOTO_REDIRECTS = 3;
const UNAVATAR_ORIGIN = "https://unavatar.io";

const PHOTO_HEADERS = {
  Accept: "image/webp,image/png,image/jpeg,image/*;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
};

async function cancelBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // The body may already be consumed or the connection may already be closed.
  }
}

function declaredLength(response: Response): number | null {
  const raw = response.headers.get("content-length");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function readBoundedBytes(
  response: Response,
  maxBytes: number
): Promise<Uint8Array | null> {
  const length = declaredLength(response);
  if (length !== null && length > maxBytes) {
    await cancelBody(response);
    return null;
  }
  if (!response.body) return null;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  if (!total) return null;
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function fetchValidatedLinkedInPhoto(
  rawUrl: string,
  signal: AbortSignal
): Promise<ValidatedPhoto | null> {
  const normalized = normalizeLinkedInProfilePhotoUrl(rawUrl);
  if (!normalized) return null;

  let current = new URL(normalized);
  for (let redirects = 0; redirects <= MAX_PHOTO_REDIRECTS; redirects++) {
    const response = await fetch(current, {
      cache: "no-store",
      redirect: "manual",
      signal,
      headers: PHOTO_HEADERS,
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      const next = location
        ? normalizeLinkedInProfilePhotoUrl(new URL(location, current).toString())
        : null;
      await cancelBody(response);
      if (!next || redirects === MAX_PHOTO_REDIRECTS) return null;
      current = new URL(next);
      continue;
    }
    return validatedPhotoFromResponse(response, current.toString());
  }
  return null;
}

export async function firstValidatedLinkedInPhoto(
  candidates: string[],
  signal: AbortSignal
): Promise<ValidatedPhoto | null> {
  for (const candidate of candidates.slice(0, 3)) {
    try {
      const photo = await fetchValidatedLinkedInPhoto(candidate, signal);
      if (photo) return photo;
    } catch {
      if (signal.aborted) return null;
    }
  }
  return null;
}

export function unavatarEndpoint(profile: URL): URL {
  const slug = profile.pathname.split("/").filter(Boolean).at(-1) ?? "";
  const endpoint = new URL(
    `/linkedin/user:${encodeURIComponent(slug)}`,
    UNAVATAR_ORIGIN
  );
  endpoint.searchParams.set("json", "true");
  endpoint.searchParams.set("fallback", "false");
  return endpoint;
}

export function photoUrlFromResolverPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const raw = (payload as Record<string, unknown>).url;
  return typeof raw === "string" ? normalizeLinkedInProfilePhotoUrl(raw) : null;
}

export async function resolveUnavatarPhoto(
  profile: URL,
  signal: AbortSignal
): Promise<string | null> {
  const response = await fetch(unavatarEndpoint(profile), {
    cache: "no-store",
    redirect: "manual",
    signal,
    headers: {
      Accept: "application/json",
      "User-Agent": PHOTO_HEADERS["User-Agent"],
    },
  });
  if (!response.ok) {
    await cancelBody(response);
    return null;
  }
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    await cancelBody(response);
    return null;
  }
  const bytes = await readBoundedBytes(response, MAX_RESOLVER_JSON_BYTES);
  if (!bytes) return null;
  try {
    return photoUrlFromResolverPayload(
      JSON.parse(new TextDecoder().decode(bytes)) as unknown
    );
  } catch {
    return null;
  }
}
