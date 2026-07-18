import { createClient } from "@/lib/supabase/server";

const MAX_PROFILE_TEXT = 18_000;

function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(
    /&(#x?[0-9a-f]+|[a-z]+);/gi,
    (match, entity: string) => {
      if (entity.startsWith("#")) {
        const hex = entity[1]?.toLowerCase() === "x";
        const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return named[entity.toLowerCase()] ?? match;
    }
  );
}

function cleanText(value: string): string {
  return decodeHtml(value).replace(/\s+/g, " ").trim();
}

function metaValues(html: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = new Map<string, string>();
    const attrRe = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
    let match: RegExpExecArray | null;
    while ((match = attrRe.exec(tag))) {
      attrs.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
    }
    const key = (attrs.get("property") ?? attrs.get("name"))?.toLowerCase();
    const content = attrs.get("content");
    if (key && content && !values.has(key)) values.set(key, cleanText(content));
  }
  return values;
}

function pageText(html: string): string {
  return cleanText(
    html
      .replace(/<!--[^]*?-->/g, " ")
      .replace(/<script\b[^>]*>[^]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[^]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[^]*?<\/noscript>/gi, " ")
      .replace(/<svg\b[^>]*>[^]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function structuredProfileText(html: string): string {
  const blocks: string[] = [];
  const scriptRe =
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([^]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRe.exec(html)) && blocks.join("\n").length < 8_000) {
    const value = cleanText(match[1]);
    if (value) blocks.push(value);
  }
  return blocks.join("\n");
}

/** LinkedIn sometimes embeds its CDN photo in page JSON without an og:image. */
function embeddedProfilePhoto(html: string): string | null {
  const normalized = html
    .replace(/\\u0026/gi, "&")
    .replace(/\\u003d/gi, "=")
    .replace(/\\\//g, "/");
  const candidates = normalized.match(
    /https:\/\/(?:media|media-exp\d*)\.licdn\.com\/dms\/image\/[^"'<>\\\s]+/gi
  );
  if (!candidates) return null;
  const preferred = candidates.find(
    (url) =>
      /profile-(?:display|framed)photo/i.test(url) &&
      !/company-logo/i.test(url)
  );
  return preferred ? decodeHtml(preferred) : null;
}

function isLinkedInProfile(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return (
    (host === "linkedin.com" || host.endsWith(".linkedin.com")) &&
    /^\/in\/[^/]+/i.test(url.pathname)
  );
}

async function fetchLinkedIn(startUrl: URL): Promise<Response> {
  let current = startUrl;
  for (let redirects = 0; redirects < 4; redirects++) {
    if (!isLinkedInProfile(current) && !/^\/authwall/i.test(current.pathname)) {
      throw new Error("LinkedIn redirected somewhere unexpected.");
    }
    const response = await fetch(current, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
      },
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) return response;
    current = new URL(location, current);
    const host = current.hostname.toLowerCase();
    if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) {
      throw new Error("LinkedIn redirected somewhere unexpected.");
    }
  }
  throw new Error("LinkedIn redirected too many times.");
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not logged in." }, { status: 401 });

  const rawUrl = new URL(request.url).searchParams.get("url")?.trim();
  if (!rawUrl) {
    return Response.json({ error: "Add a LinkedIn profile URL first." }, { status: 400 });
  }

  let profileUrl: URL;
  try {
    profileUrl = new URL(rawUrl);
  } catch {
    return Response.json({ error: "That doesn't look like a valid URL." }, { status: 400 });
  }
  if (profileUrl.protocol !== "https:" || !isLinkedInProfile(profileUrl)) {
    return Response.json(
      { error: "Use a public https://linkedin.com/in/... profile URL." },
      { status: 400 }
    );
  }

  try {
    const response = await fetchLinkedIn(profileUrl);
    if (!response.ok) {
      return Response.json(
        {
          error:
            "LinkedIn didn't expose that public profile right now. Check the URL and try once more.",
        },
        { status: 502 }
      );
    }
    const html = await response.text();
    const meta = metaValues(html);
    const title = meta.get("og:title") ?? meta.get("twitter:title") ?? "";
    const description =
      meta.get("og:description") ?? meta.get("description") ?? "";
    const structured = structuredProfileText(html);
    const visible = pageText(html);
    const profileText = [
      `LinkedIn URL: ${profileUrl.toString()}`,
      title && `Profile title: ${title}`,
      description && `Profile description: ${description}`,
      structured && `Structured profile data: ${structured}`,
      visible && `Public profile text: ${visible}`,
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, MAX_PROFILE_TEXT);

    if (!title && !description && !structured && visible.length < 80) {
      return Response.json(
        {
          error:
            "LinkedIn returned a sign-in wall without public profile details. The profile may not be publicly visible.",
        },
        { status: 502 }
      );
    }

    const photoUrl =
      meta.get("og:image") ??
      meta.get("twitter:image") ??
      embeddedProfilePhoto(html);
    return Response.json({ profileText, photoUrl });
  } catch (error) {
    console.error("LinkedIn profile fetch failed:", error);
    return Response.json(
      { error: "Couldn't read that LinkedIn profile right now — try again shortly." },
      { status: 502 }
    );
  }
}
