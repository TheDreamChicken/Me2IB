import { isIP } from "node:net";
import { createClient } from "@/lib/supabase/server";

type JsonObject = Record<string, unknown>;

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
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
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

function isObject(value: unknown): value is JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function findJobPosting(value: unknown): JsonObject | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJobPosting(item);
      if (found) return found;
    }
    return null;
  }
  if (!isObject(value)) return null;
  const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
  if (types.some((type) => String(type).toLowerCase() === "jobposting")) return value;
  const graph = findJobPosting(value["@graph"]);
  if (graph) return graph;
  return null;
}

function extractJobPosting(html: string): JsonObject | null {
  const scriptRe =
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([^]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRe.exec(html))) {
    try {
      const found = findJobPosting(JSON.parse(decodeHtml(match[1])));
      if (found) return found;
    } catch {
      // Some sites include unrelated or malformed JSON-LD; keep looking.
    }
  }
  return null;
}

function stringValue(value: unknown): string | null {
  if (typeof value === "string") return cleanText(value) || null;
  if (typeof value === "number") return String(value);
  return null;
}

function companyName(job: JsonObject | null): string | null {
  if (!job) return null;
  const org = job.hiringOrganization;
  return isObject(org) ? stringValue(org.name) : stringValue(org);
}

function addressText(value: unknown): string | null {
  if (Array.isArray(value)) {
    const parts = value.map(addressText).filter((part): part is string => !!part);
    return parts.length ? [...new Set(parts)].join("; ") : null;
  }
  if (!isObject(value)) return stringValue(value);
  const address = isObject(value.address) ? value.address : value;
  const country = isObject(address.addressCountry)
    ? stringValue(address.addressCountry.name)
    : stringValue(address.addressCountry);
  const parts = [
    stringValue(address.addressLocality),
    stringValue(address.addressRegion),
    country,
  ].filter((part): part is string => !!part);
  return parts.length ? [...new Set(parts)].join(", ") : null;
}

function employmentType(value: unknown, text: string): string | null {
  const raw = (Array.isArray(value) ? value.join(" ") : String(value ?? "")).toLowerCase();
  if (raw.includes("intern") || /\bintern(ship)?\b/i.test(text)) return "internship";
  if (raw.includes("full") || /\bfull[- ]?time\b/i.test(text)) return "full-time";
  if (/\bextern(ship)?\b/i.test(text)) return "externship";
  if (/\bprogram\b|\bfellowship\b/i.test(text)) return "program";
  return null;
}

function workType(job: JsonObject | null, text: string): string | null {
  const raw = String(job?.jobLocationType ?? "").toLowerCase();
  if (raw.includes("telecommute") || /\bremote\b/i.test(text)) return "remote";
  if (/\bhybrid\b/i.test(text)) return "hybrid";
  if (job?.jobLocation || /\bin[- ]person\b|\bon[- ]site\b/i.test(text)) return "in-person";
  return null;
}

function industry(text: string): string | null {
  const lower = text.toLowerCase();
  if (/consult(ing|ant)|strategy advisory/.test(lower)) return "consulting";
  if (/investment bank|private equity|asset management|wealth management|finance|capital markets|accounting/.test(lower)) return "finance";
  if (/real estate|property|reit/.test(lower)) return "real_estate";
  if (/data scien|analytics|business intelligence/.test(lower)) return "data";
  if (/software|engineer|technology|product manager|cyber/.test(lower)) return "tech";
  if (/marketing|brand|communications|growth/.test(lower)) return "marketing";
  if (/operations|supply chain|logistics/.test(lower)) return "operations";
  return null;
}

function season(text: string): string | null {
  const match = text.match(/\b(spring|summer|fall|autumn|winter)\b(?:\s+(20\d{2}))?/i);
  if (!match) return null;
  const name = match[1].toLowerCase() === "autumn" ? "Fall" : match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
  const year = match[2] ?? text.match(/\b20\d{2}\b/)?.[0];
  return `${name}${year ? ` ${year}` : ""}`;
}

function salaryText(value: unknown): string | null {
  if (!isObject(value)) return stringValue(value);
  const currency = stringValue(value.currency) ?? "";
  const amount = isObject(value.value) ? value.value : value;
  const min = stringValue(amount.minValue);
  const max = stringValue(amount.maxValue);
  const exact = stringValue(amount.value);
  const unit = stringValue(amount.unitText)?.toLowerCase();
  const range = min && max ? `${min}–${max}` : exact ?? min ?? max;
  return range ? [currency, range, unit && `per ${unit}`].filter(Boolean).join(" ") : null;
}

function validatePublicUrl(url: URL): boolean {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== "80" && url.port !== "443") return false;
  const host = url.hostname.toLowerCase();
  if (isIP(host)) return false;
  return !(
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  );
}

async function fetchPublicPage(startUrl: URL): Promise<{ response: Response; finalUrl: URL }> {
  let current = startUrl;
  for (let redirects = 0; redirects < 5; redirects++) {
    if (!validatePublicUrl(current)) throw new Error("Unsafe posting URL.");
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
    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return { response, finalUrl: current };
    }
    const location = response.headers.get("location");
    if (!location) return { response, finalUrl: current };
    current = new URL(location, current);
  }
  throw new Error("Too many redirects.");
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not logged in." }, { status: 401 });

  const rawUrl = new URL(request.url).searchParams.get("url")?.trim();
  if (!rawUrl) {
    return Response.json({ error: "Paste a job posting link first." }, { status: 400 });
  }

  let postingUrl: URL;
  try {
    postingUrl = new URL(rawUrl);
  } catch {
    return Response.json({ error: "That doesn't look like a valid URL." }, { status: 400 });
  }
  if (!validatePublicUrl(postingUrl)) {
    return Response.json({ error: "Use a public http or https job posting URL." }, { status: 400 });
  }

  try {
    const { response, finalUrl } = await fetchPublicPage(postingUrl);
    if (!response.ok) {
      return Response.json(
        { error: "That job site blocked the posting. Try its direct company careers link." },
        { status: 502 }
      );
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      return Response.json({ error: "That link isn't an HTML job posting." }, { status: 400 });
    }
    const html = await response.text();
    const meta = metaValues(html);
    const job = extractJobPosting(html);
    const metaTitle = meta.get("og:title") ?? meta.get("twitter:title") ?? "";
    const description =
      stringValue(job?.description) ?? meta.get("og:description") ?? meta.get("description") ?? "";
    const title = stringValue(job?.title) ?? (metaTitle ? cleanText(metaTitle) : null);
    const company = companyName(job);
    const searchText = [title, company, description].filter(Boolean).join(" ");
    const remote = String(job?.jobLocationType ?? "").toUpperCase().includes("TELECOMMUTE");
    const location = remote
      ? addressText(job?.applicantLocationRequirements) ?? "Remote"
      : addressText(job?.jobLocation);
    const deadlineRaw = stringValue(job?.validThrough);
    const deadline = deadlineRaw?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null;

    if (!job && !title) {
      return Response.json(
        { error: "I couldn't find job details on that page. Try the direct company posting." },
        { status: 422 }
      );
    }

    return Response.json({
      company,
      position: title,
      industry: industry(searchText),
      location,
      work_type: workType(job, searchText),
      employment_type: employmentType(job?.employmentType, searchText),
      season: season(searchText),
      pay: salaryText(job?.baseSalary),
      deadline,
      posting_link: finalUrl.toString(),
      application_link: finalUrl.toString(),
    });
  } catch (error) {
    console.error("Job posting autofill failed:", error);
    return Response.json(
      { error: "Couldn't read that posting right now. Try its direct company careers link." },
      { status: 502 }
    );
  }
}
