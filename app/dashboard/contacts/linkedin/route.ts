import { createClient } from "@/lib/supabase/server";
import {
  normalizeLinkedInProfilePhotoUrl,
  normalizeLinkedInProfileUrl,
  parseLinkedInProfile,
  type DirectContactFields,
  type LinkedInAccess,
} from "./profile-parser";

const LINKEDIN_HOME = "https://www.linkedin.com/";
const MAX_PROFILE_TEXT = 18_000;
const MAX_HTML_BYTES = 5_000_000;
const MAX_IMAGE_BYTES = 10_000_000;
const REQUEST_TIMEOUT_MS = 18_000;
const PHOTO_TIMEOUT_MS = 8_000;

const LINKEDIN_HEADERS = {
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
};

type CookieJar = Map<string, string>;

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

async function seedGuestSession(jar: CookieJar, signal: AbortSignal): Promise<void> {
  const response = await fetch(LINKEDIN_HOME, {
    cache: "no-store",
    redirect: "manual",
    signal,
    headers: LINKEDIN_HEADERS,
  });
  mergeCookies(jar, response.headers);
  await cancelBody(response);
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
    const sameProfile = next.pathname.replace(/\/$/, "") === profile.pathname;
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

function warningFor(access: LinkedInAccess, hasPhoto: boolean): string | undefined {
  if (access === "public" && hasPhoto) return undefined;
  if (access === "public") {
    return "LinkedIn shared the public profile details, but no verifiable profile photo was available.";
  }
  if (access === "blocked") {
    return "LinkedIn throttled the direct lookup. I used exact-URL public web results for anything else I could verify.";
  }
  if (access === "authwall") {
    return "LinkedIn showed the importer a sign-in wall. I used exact-URL public web results for anything else I could verify.";
  }
  return "LinkedIn did not expose the direct profile this time. I used exact-URL public web results for anything else I could verify.";
}

function fallbackPayload(profile: URL, warning: string) {
  const access: LinkedInAccess = "unavailable";
  return {
    profileText: profileText(profile, access),
    photoUrl: null,
    fields: { linkedin_url: profile.toString() } satisfies DirectContactFields,
    access,
    warning,
  };
}

async function validatePhoto(raw: string, signal: AbortSignal): Promise<string | null> {
  const normalized = normalizeLinkedInProfilePhotoUrl(raw);
  if (!normalized) return null;
  let current = new URL(normalized);
  for (let redirects = 0; redirects < 3; redirects++) {
    const response = await fetch(current, {
      cache: "no-store",
      redirect: "manual",
      signal,
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
        "User-Agent": LINKEDIN_HEADERS["User-Agent"],
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      const next = location
        ? normalizeLinkedInProfilePhotoUrl(new URL(location, current).toString())
        : null;
      await cancelBody(response);
      if (!next) return null;
      current = new URL(next);
      continue;
    }
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const contentLength = Number(response.headers.get("content-length"));
    const isImage = /^image\/(?:avif|gif|jpeg|png|webp)(?:;|$)/i.test(contentType);
    const saneSize = !Number.isFinite(contentLength) || contentLength <= MAX_IMAGE_BYTES;
    const valid = response.ok && isImage && saneSize;
    await cancelBody(response);
    return valid ? current.toString() : null;
  }
  return null;
}

async function firstValidatedPhoto(candidates: string[]): Promise<string | null> {
  const signal = AbortSignal.timeout(PHOTO_TIMEOUT_MS);
  for (const candidate of candidates.slice(0, 3)) {
    try {
      const photo = await validatePhoto(candidate, signal);
      if (photo) return photo;
    } catch {
      if (signal.aborted) return null;
    }
  }
  return null;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Not logged in." }, 401);

  const searchParams = new URL(request.url).searchParams;
  const rawUrl = searchParams.get("url")?.trim();
  if (!rawUrl) return json({ error: "Add a LinkedIn profile URL first." }, 400);
  const profile = normalizeLinkedInProfileUrl(rawUrl);
  if (!profile) {
    return json(
      { error: "Use a public https://www.linkedin.com/in/... profile URL." },
      400
    );
  }

  try {
    const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const jar: CookieJar = new Map();
    await seedGuestSession(jar, signal);
    const response = await fetchProfile(profile, jar, signal);
    const html = await readHtml(response);
    const parsed = parseLinkedInProfile(html, profile.toString(), response.status);
    const photoUrl = await firstValidatedPhoto(parsed.photoCandidates);
    const fields: DirectContactFields = { ...parsed.fields };
    delete fields.photo_url;
    if (photoUrl) fields.photo_url = photoUrl;
    return json({
      profileText: profileText(
        profile,
        parsed.access,
        parsed.exactPersonSummary,
        parsed.title,
        parsed.description,
        parsed.visibleText
      ),
      photoUrl,
      fields,
      access: parsed.access,
      warning: warningFor(parsed.access, Boolean(photoUrl)),
    });
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
  }
}
