import { createClient } from "@/lib/supabase/server";
import {
  normalizeLinkedInProfileUrl,
  parseLinkedInProfile,
  type DirectContactFields,
  type LinkedInAccess,
} from "./profile-parser";
import {
  fetchValidatedLinkedInPhoto,
  firstValidatedLinkedInPhoto,
  resolveUnavatarPhoto,
  type ValidatedPhoto,
} from "./photo-pipeline";
import {
  persistPhoto,
  storedPhoto,
  type PhotoSource,
  type SupabaseClient,
} from "./photo-storage";

export const maxDuration = 60;

const LINKEDIN_HOME = "https://www.linkedin.com/";
const MAX_PROFILE_TEXT = 18_000;
const MAX_HTML_BYTES = 5_000_000;
const REQUEST_TIMEOUT_MS = 12_000;
const PHOTO_TIMEOUT_MS = 10_000;
const RESOLVER_TIMEOUT_MS = 12_000;
const RESULT_CACHE_MS = 5 * 60_000;
const EMPTY_RESULT_CACHE_MS = 20_000;
const DIRECT_BLOCK_CIRCUIT_MS = 2 * 60_000;
const RATE_WINDOW_MS = 5 * 60_000;
const RATE_LIMIT = 20;
const MAX_MEMORY_ENTRIES = 250;

const LINKEDIN_HEADERS = {
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
};

type CookieJar = Map<string, string>;

type LinkedInPayload = {
  profileText: string;
  photoUrl: string | null;
  photoSource: PhotoSource | null;
  fields: DirectContactFields;
  access: LinkedInAccess;
  warning?: string;
};

type CachedPayload = {
  expiresAt: number;
  payload: LinkedInPayload;
};

const resultCache = new Map<string, CachedPayload>();
const inFlight = new Map<string, Promise<LinkedInPayload>>();
const requestWindows = new Map<string, number[]>();
let directBlockedUntil = 0;

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

function mergeCookies(jar: CookieJar, headers: Headers): void {
  for (const raw of headers.getSetCookie()) {
    const pair = raw.slice(0, raw.indexOf(";") < 0 ? raw.length : raw.indexOf(";"));
    const equals = pair.indexOf("=");
    if (equals < 1) continue;
    const name = pair.slice(0, equals).trim();
    const value = pair.slice(equals + 1).trim();
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || /[\r\n]/.test(value)) {
      continue;
    }
    jar.set(name, value);
  }
}

function cookieHeader(jar: CookieJar): string {
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function cancelBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // The response is already complete or the connection closed itself.
  }
}

async function seedGuestSession(
  jar: CookieJar,
  signal: AbortSignal
): Promise<number> {
  const response = await fetch(LINKEDIN_HOME, {
    cache: "no-store",
    redirect: "manual",
    signal,
    headers: LINKEDIN_HEADERS,
  });
  mergeCookies(jar, response.headers);
  const status = response.status;
  await cancelBody(response);
  return status;
}

function safeLinkedInRedirect(raw: string, current: URL, profile: URL): URL | null {
  try {
    const next = new URL(raw, current);
    if (
      next.protocol !== "https:" ||
      next.hostname !== "www.linkedin.com" ||
      next.username ||
      next.password ||
      next.port
    ) {
      return null;
    }
    const sameProfile =
      next.pathname.replace(/\/$/, "").toLowerCase() ===
      profile.pathname.toLowerCase();
    return sameProfile || next.pathname === "/authwall" ? next : null;
  } catch {
    return null;
  }
}

async function fetchProfile(
  profile: URL,
  jar: CookieJar,
  signal: AbortSignal
): Promise<Response> {
  let current = profile;
  for (let redirects = 0; redirects < 3; redirects++) {
    const cookie = cookieHeader(jar);
    const response = await fetch(current, {
      cache: "no-store",
      redirect: "manual",
      signal,
      headers: {
        ...LINKEDIN_HEADERS,
        Referer: LINKEDIN_HOME,
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });
    mergeCookies(jar, response.headers);
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    const next = location ? safeLinkedInRedirect(location, current, profile) : null;
    if (!next) {
      await cancelBody(response);
      throw new Error("LinkedIn redirected somewhere unexpected.");
    }
    await cancelBody(response);
    current = next;
  }
  throw new Error("LinkedIn redirected too many times.");
}

async function readHtml(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType && !contentType.includes("text/html") && !contentType.includes("xhtml")) {
    await cancelBody(response);
    throw new Error("LinkedIn returned a non-HTML response.");
  }
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_HTML_BYTES) {
    await cancelBody(response);
    throw new Error("LinkedIn returned an oversized profile page.");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let html = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error("LinkedIn returned an oversized profile page.");
    }
    html += decoder.decode(value, { stream: true });
  }
  return html + decoder.decode();
}

function accessDescription(access: LinkedInAccess): string {
  switch (access) {
    case "public":
      return "LinkedIn returned an exact public JSON-LD profile record.";
    case "blocked":
      return "LinkedIn throttled this server request, so no direct profile facts were available.";
    case "authwall":
      return "LinkedIn returned a sign-in wall, so no direct profile facts were available.";
    default:
      return "LinkedIn did not return an exact public profile record to this server request.";
  }
}

function searchHints(profile: URL): string {
  const slug = profile.pathname.split("/").filter(Boolean).at(-1) ?? "";
  return [
    `Exact URL query: "${profile.toString()}"`,
    `Exact path query: site:linkedin.com/in/${slug}`,
    `Exact identifier query: "${slug}"`,
  ].join("\n");
}

function profileText(
  profile: URL,
  access: LinkedInAccess,
  exactPersonSummary = "",
  title = "",
  description = "",
  visibleText = ""
): string {
  const directPublic = access === "public";
  return [
    `LinkedIn URL: ${profile.toString()}`,
    `Direct profile access: ${accessDescription(access)}`,
    exactPersonSummary && `Exact matching LinkedIn Person data:\n${exactPersonSummary}`,
    directPublic && title && `Profile title: ${title}`,
    directPublic && description && `Profile description: ${description}`,
    directPublic && visibleText && `Public profile text: ${visibleText.slice(0, 6_000)}`,
    `Exact-identity search hints (identifiers only, not profile facts):\n${searchHints(profile)}`,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, MAX_PROFILE_TEXT);
}

function warningFor(
  access: LinkedInAccess,
  photoSource: PhotoSource | null,
  storageFailed: boolean
): string | undefined {
  let warning: string | undefined;
  if (access === "public" && photoSource === "linkedin") {
    warning = undefined;
  } else if (access === "public" && photoSource === "unavatar") {
    warning =
      "LinkedIn shared the public details; a profile-photo candidate tied to that exact URL was recovered through the avatar fallback. Confirm the photo before saving.";
  } else if (access === "public") {
    warning =
      "LinkedIn shared the public profile details, but no verifiable profile photo was available.";
  } else if (access === "blocked" && photoSource === "unavatar") {
    warning =
      "LinkedIn throttled the direct details lookup, but a profile-photo candidate tied to that exact URL was recovered through the avatar fallback. I used exact-URL public web results for remaining fields; confirm the photo before saving.";
  } else if (access === "authwall" && photoSource === "unavatar") {
    warning =
      "LinkedIn showed the importer a sign-in wall, but a profile-photo candidate tied to that exact URL was recovered through the avatar fallback. I used exact-URL public web results for remaining fields; confirm the photo before saving.";
  } else if (access === "blocked") {
    warning =
      "LinkedIn throttled the direct lookup. I used exact-URL public web results for anything else I could verify.";
  } else if (access === "authwall") {
    warning =
      "LinkedIn showed the importer a sign-in wall. I used exact-URL public web results for anything else I could verify.";
  } else if (photoSource === "unavatar") {
    warning =
      "A profile-photo candidate tied to that exact URL was recovered through the avatar fallback. I used exact-URL public web results for remaining fields; confirm the photo before saving.";
  } else {
    warning =
      "LinkedIn did not expose the direct profile this time. I used exact-URL public web results for anything else I could verify.";
  }
  if (!storageFailed) return warning;
  return [
    warning,
    "A photo was found but could not be saved. Avatar storage may need supabase/schema.sql re-run before photos can persist.",
  ]
    .filter(Boolean)
    .join(" ");
}

function fallbackPayload(profile: URL, warning: string) {
  const access: LinkedInAccess = "unavailable";
  return {
    profileText: profileText(profile, access),
    photoUrl: null,
    photoSource: null,
    fields: { linkedin_url: profile.toString() } satisfies DirectContactFields,
    access,
    warning,
  } satisfies LinkedInPayload;
}

function isBlockedStatus(status: number): boolean {
  return status === 403 || status === 429 || status === 999;
}

function pruneMemory(now: number): void {
  for (const [key, entry] of resultCache) {
    if (entry.expiresAt <= now) resultCache.delete(key);
  }
  for (const [userId, times] of requestWindows) {
    const recent = times.filter((time) => now - time < RATE_WINDOW_MS);
    if (recent.length) requestWindows.set(userId, recent);
    else requestWindows.delete(userId);
  }
  while (resultCache.size > MAX_MEMORY_ENTRIES) {
    const oldest = resultCache.keys().next().value as string | undefined;
    if (!oldest) break;
    resultCache.delete(oldest);
  }
  while (requestWindows.size > MAX_MEMORY_ENTRIES) {
    const oldest = requestWindows.keys().next().value as string | undefined;
    if (!oldest) break;
    requestWindows.delete(oldest);
  }
}

function rateLimitRetryAfter(userId: string, now: number): number | null {
  const recent = (requestWindows.get(userId) ?? []).filter(
    (time) => now - time < RATE_WINDOW_MS
  );
  if (recent.length >= RATE_LIMIT) {
    return Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - recent[0])) / 1_000));
  }
  recent.push(now);
  requestWindows.set(userId, recent);
  return null;
}

async function processProfile(
  profile: URL,
  userId: string,
  supabase: SupabaseClient
): Promise<LinkedInPayload> {
  const savedPhoto = await storedPhoto(supabase, userId, profile);
  let access: LinkedInAccess = "unavailable";
  let fields: DirectContactFields = { linkedin_url: profile.toString() };
  let exactPersonSummary = "";
  let title = "";
  let description = "";
  let visibleText = "";
  let directCandidates: string[] = [];

  if (Date.now() < directBlockedUntil) {
    access = "blocked";
  } else {
    try {
      const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
      const jar: CookieJar = new Map();
      const seedStatus = await seedGuestSession(jar, signal);
      if (isBlockedStatus(seedStatus)) {
        directBlockedUntil = Date.now() + DIRECT_BLOCK_CIRCUIT_MS;
        access = "blocked";
      } else {
        const response = await fetchProfile(profile, jar, signal);
        if (isBlockedStatus(response.status)) {
          directBlockedUntil = Date.now() + DIRECT_BLOCK_CIRCUIT_MS;
          access = "blocked";
          await cancelBody(response);
        } else {
          const html = await readHtml(response);
          const parsed = parseLinkedInProfile(
            html,
            profile.toString(),
            response.status
          );
          access = parsed.access;
          fields = { ...parsed.fields };
          exactPersonSummary = parsed.exactPersonSummary;
          title = parsed.title;
          description = parsed.description;
          visibleText = parsed.visibleText;
          directCandidates = parsed.photoCandidates;
        }
      }
    } catch (error) {
      console.error(
        "LinkedIn public-profile lookup failed:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  let photo: ValidatedPhoto | null = null;
  let photoUrl: string | null = savedPhoto?.fresh ? savedPhoto.url : null;
  let photoSource: PhotoSource | null = savedPhoto?.fresh
    ? savedPhoto.source
    : null;
  if (!photoUrl && directCandidates.length) {
    photo = await firstValidatedLinkedInPhoto(
      directCandidates,
      AbortSignal.timeout(PHOTO_TIMEOUT_MS)
    );
    if (photo) photoSource = "linkedin";
  }

  if (!photoUrl && !photo) {
    try {
      const candidate = await resolveUnavatarPhoto(
        profile,
        AbortSignal.timeout(RESOLVER_TIMEOUT_MS)
      );
      if (candidate) {
        photo = await fetchValidatedLinkedInPhoto(
          candidate,
          AbortSignal.timeout(PHOTO_TIMEOUT_MS)
        );
        if (photo) photoSource = "unavatar";
      }
    } catch (error) {
      console.error(
        "LinkedIn avatar fallback failed:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  let storageFailed = false;
  if (photo && photoSource) {
    photoUrl = await persistPhoto(supabase, userId, profile, photo, photoSource);
    storageFailed = !photoUrl;
  }
  if (!photoUrl && savedPhoto) {
    photoUrl = savedPhoto.url;
    photoSource = savedPhoto.source;
  }
  delete fields.photo_url;
  if (photoUrl) fields.photo_url = photoUrl;

  return {
    profileText: profileText(
      profile,
      access,
      exactPersonSummary,
      title,
      description,
      visibleText
    ),
    photoUrl,
    photoSource: photoUrl ? photoSource : null,
    fields,
    access,
    warning: warningFor(access, photoUrl ? photoSource : null, storageFailed),
  };
}

function requestUrl(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const url = (value as Record<string, unknown>).url;
  return typeof url === "string" ? url.trim() : null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Not logged in." }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Send a LinkedIn profile URL." }, 400);
  }
  const rawUrl = requestUrl(body);
  if (!rawUrl) return json({ error: "Add a LinkedIn profile URL first." }, 400);
  const profile = normalizeLinkedInProfileUrl(rawUrl);
  if (!profile) {
    return json(
      { error: "Use a public https://www.linkedin.com/in/... profile URL." },
      400
    );
  }

  const now = Date.now();
  pruneMemory(now);
  const cacheKey = `${user.id}:${profile.toString()}`;
  const cached = resultCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return json(cached.payload);

  const running = inFlight.get(cacheKey);
  if (running) {
    try {
      return json(await running);
    } catch {
      return json(
        fallbackPayload(
          profile,
          "LinkedIn's public page could not be reached this time. I used exact-URL public web results for anything else I could verify."
        )
      );
    }
  }

  const retryAfter = rateLimitRetryAfter(user.id, now);
  if (retryAfter !== null) {
    return Response.json(
      {
        error: `Too many profile pulls at once. Try again in about ${retryAfter} seconds.`,
      },
      {
        status: 429,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  const work = processProfile(profile, user.id, supabase);
  inFlight.set(cacheKey, work);
  try {
    const payload = await work;
    resultCache.set(cacheKey, {
      expiresAt:
        Date.now() + (payload.photoUrl ? RESULT_CACHE_MS : EMPTY_RESULT_CACHE_MS),
      payload,
    });
    return json(payload);
  } catch (error) {
    console.error(
      "LinkedIn public-profile lookup failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return json(
      fallbackPayload(
        profile,
        "LinkedIn's public page could not be reached this time. I used exact-URL public web results for anything else I could verify."
      )
    );
  } finally {
    if (inFlight.get(cacheKey) === work) inFlight.delete(cacheKey);
  }
}
