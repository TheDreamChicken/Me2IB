const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

const PROFILE_PHOTO_HOST = /^(?:media|media-exp\d+)\.licdn\.com$/i;
const PROFILE_PHOTO_PATH = /\/dms\/image\/.*profile-(?:display|framed)photo(?:[-_/]|$)/i;
const LINKEDIN_PROFILE_HOST = /^(?:(?:www|[a-z]{2,3})\.)?linkedin\.com$/i;
const MASKED_VALUE = /^[\s*•_.-]+$/;

export type LinkedInAccess = "public" | "authwall" | "blocked" | "unavailable";

export type DirectContactFields = {
  name?: string;
  company?: string;
  position?: string;
  location?: string;
  email?: string;
  phone?: string;
  linkedin_url: string;
  photo_url?: string;
  alma_mater?: string;
};

export type ParsedLinkedInProfile = {
  access: LinkedInAccess;
  fields: DirectContactFields;
  title: string;
  description: string;
  exactPersonSummary: string;
  visibleText: string;
  photoCandidates: string[];
  hasExactPerson: boolean;
};

type UnknownRecord = Record<string, unknown>;

type PhotoCandidate = {
  hint: string;
  score: number;
  url: string;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function decodeHtml(value: string): string {
  return value.replace(
    /&(#x?[0-9a-f]+|[a-z]+);/gi,
    (match, entity: string) => {
      if (!entity.startsWith("#")) {
        return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
      }
      const hex = entity[1]?.toLowerCase() === "x";
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isInteger(code) && code >= 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
  );
}

function decodeEmbeddedValue(value: string): string {
  let decoded = value;
  for (let pass = 0; pass < 2; pass++) {
    decoded = decodeHtml(decoded)
      .replace(/\\u([0-9a-f]{4})/gi, (_match, code: string) =>
        String.fromCodePoint(Number.parseInt(code, 16))
      )
      .replace(/\\x([0-9a-f]{2})/gi, (_match, code: string) =>
        String.fromCodePoint(Number.parseInt(code, 16))
      )
      .replace(/\\\//g, "/")
      .replace(
        /%(?:25|26|2f|3a|3d|3f)/gi,
        (encoded) => String.fromCodePoint(Number.parseInt(encoded.slice(1), 16))
      );
  }
  return decoded;
}

function cleanText(value: string): string {
  return decodeEmbeddedValue(value).replace(/\s+/g, " ").trim();
}

function attributeMap(tag: string): Map<string, string> {
  const attributes = new Map<string, string>();
  const expression = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(tag))) {
    attributes.set(
      match[1].toLowerCase(),
      decodeEmbeddedValue(match[2] ?? match[3] ?? match[4] ?? "")
    );
  }
  return attributes;
}

function metaValues(html: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes = attributeMap(tag);
    const key = (attributes.get("property") ?? attributes.get("name"))?.toLowerCase();
    const content = attributes.get("content");
    if (key && content && !values.has(key)) values.set(key, cleanText(content));
  }
  return values;
}

function documentTitle(html: string): string {
  return cleanText(html.match(/<title\b[^>]*>([^]*?)<\/title>/i)?.[1] ?? "");
}

function pageText(html: string): string {
  return cleanText(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function jsonLdValues(html: string): unknown[] {
  const values: unknown[] = [];
  const expression = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(html))) {
    const attributes = attributeMap(match[1]);
    if (attributes.get("type")?.toLowerCase() !== "application/ld+json") continue;
    try {
      values.push(JSON.parse(decodeHtml(match[2]).trim()));
    } catch {
      // One malformed structured-data block should not discard the others.
    }
  }
  return values;
}

function collectPeople(value: unknown, people: UnknownRecord[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectPeople(item, people);
    return;
  }
  if (!isRecord(value)) return;
  const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
  if (types.some((type) => String(type).toLowerCase() === "person")) people.push(value);
  for (const child of Object.values(value)) collectPeople(child, people);
}

function usableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = cleanText(value);
  if (!cleaned || MASKED_VALUE.test(cleaned) || !/[\p{L}\p{N}]/u.test(cleaned)) {
    return null;
  }
  return cleaned;
}

function firstUsableString(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstUsableString(item);
      if (found) return found;
    }
    return null;
  }
  return usableString(value);
}

function firstNamedValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstNamedValue(item);
      if (found) return found;
    }
    return null;
  }
  if (isRecord(value)) return firstUsableString(value.name);
  return firstUsableString(value);
}

function currentUsableString(value: unknown): string | null {
  return firstUsableString(Array.isArray(value) ? value[0] : value);
}

function currentNamedValue(value: unknown): string | null {
  const current = Array.isArray(value) ? value[0] : value;
  return isRecord(current)
    ? firstUsableString(current.name)
    : firstUsableString(current);
}

function profileKey(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !LINKEDIN_PROFILE_HOST.test(url.hostname)) {
      return null;
    }
    const match = url.pathname.match(/^\/in\/([a-z0-9_-]+)\/?$/i);
    return match ? `linkedin.com/in/${match[1].toLowerCase()}` : null;
  } catch {
    return null;
  }
}

function personUrls(person: UnknownRecord): string[] {
  const values: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string") values.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (isRecord(value)) {
      visit(value.url);
      visit(value["@id"]);
    }
  };
  visit(person.url);
  visit(person.sameAs);
  visit(person.mainEntityOfPage);
  return values;
}

function personScore(person: UnknownRecord, requestedKey: string): number {
  const exactMatches = personUrls(person).filter(
    (value) => profileKey(value) === requestedKey
  ).length;
  if (!exactMatches) return -1;
  let score = exactMatches * 1_000;
  if (usableString(person.name)) score += 100;
  if (currentNamedValue(person.worksFor)) score += 80;
  if (firstNamedValue(person.alumniOf)) score += 60;
  if (currentUsableString(person.jobTitle)) score += 50;
  if (isRecord(person.address) && usableString(person.address.addressLocality)) score += 40;
  if (person.image) score += 30;
  return score;
}

function exactPerson(html: string, canonicalUrl: string): UnknownRecord | null {
  const key = profileKey(canonicalUrl);
  if (!key) return null;
  const people: UnknownRecord[] = [];
  for (const value of jsonLdValues(html)) collectPeople(value, people);
  return (
    people
      .map((person) => ({ person, score: personScore(person, key) }))
      .filter(({ score }) => score >= 0)
      .sort((a, b) => b.score - a.score)[0]?.person ?? null
  );
}

function recordValue(record: UnknownRecord | null, key: string): unknown {
  return record?.[key];
}

function personLocation(person: UnknownRecord | null): string | null {
  const address = recordValue(person, "address");
  if (Array.isArray(address)) {
    for (const item of address) {
      const found = personLocation(isRecord(item) ? { address: item } : null);
      if (found) return found;
    }
  }
  return isRecord(address) ? usableString(address.addressLocality) : null;
}

function personImageValues(person: UnknownRecord | null): string[] {
  const images = recordValue(person, "image");
  const values: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string") values.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (isRecord(value)) {
      visit(value.contentUrl);
      visit(value.url);
      visit(value.thumbnailUrl);
    }
  };
  visit(images);
  return values;
}

export function normalizeLinkedInProfileUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    if (
      url.protocol !== "https:" ||
      !LINKEDIN_PROFILE_HOST.test(url.hostname) ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }
    const match = url.pathname.match(/^\/in\/([a-z0-9_-]+)\/?$/i);
    if (!match) return null;
    return new URL(`https://www.linkedin.com/in/${match[1]}`);
  } catch {
    return null;
  }
}

export function normalizeLinkedInProfilePhotoUrl(raw: string): string | null {
  try {
    const decoded = decodeEmbeddedValue(raw).replace(/[),.;\]}]+$/g, "");
    const url = new URL(decoded);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !PROFILE_PHOTO_HOST.test(url.hostname) ||
      !PROFILE_PHOTO_PATH.test(url.pathname) ||
      /(?:company|school|organization)-logo|background|cover|favicon|ghost|default/i.test(
        url.pathname
      )
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function addPhotoCandidate(
  candidates: PhotoCandidate[],
  raw: string | undefined,
  score: number,
  hint: string
): void {
  if (!raw) return;
  const url = normalizeLinkedInProfilePhotoUrl(raw);
  if (!url) return;
  const existing = candidates.find((candidate) => candidate.url === url);
  if (existing) {
    if (score > existing.score) {
      existing.score = score;
      existing.hint = hint;
    }
    return;
  }
  candidates.push({ hint, score, url });
}

function photoCandidates(
  person: UnknownRecord | null,
  meta: Map<string, string>
): string[] {
  const candidates: PhotoCandidate[] = [];
  for (const value of personImageValues(person)) {
    addPhotoCandidate(candidates, value, 1_000, "exact-person-json-ld");
  }
  addPhotoCandidate(candidates, meta.get("og:image:secure_url"), 700, "og:image:secure_url");
  addPhotoCandidate(candidates, meta.get("og:image"), 680, "og:image");
  addPhotoCandidate(candidates, meta.get("twitter:image:src"), 650, "twitter:image:src");
  addPhotoCandidate(candidates, meta.get("twitter:image"), 630, "twitter:image");

  return candidates.sort((a, b) => b.score - a.score).map(({ url }) => url);
}

function isAuthwallPage(html: string, title: string): boolean {
  return (
    /seo-authwall-base|sessionRedirect=|linkedin\.com\/authwall/i.test(html) ||
    /^(?:sign up|join linkedin|sign in)(?:\s*\|\s*linkedin)?$/i.test(title)
  );
}

function accessFor(status: number, html: string, title: string, hasPerson: boolean): LinkedInAccess {
  if (status === 999 || status === 403 || status === 429) return "blocked";
  if (status >= 200 && status < 300 && hasPerson) return "public";
  if (isAuthwallPage(html, title)) return "authwall";
  return "unavailable";
}

function summarizeExactPerson(person: UnknownRecord | null): string {
  if (!person) return "";
  const values = {
    name: usableString(person.name),
    company: currentNamedValue(person.worksFor),
    position: currentUsableString(person.jobTitle),
    location: personLocation(person),
    school: firstNamedValue(person.alumniOf),
    email: firstUsableString(person.email),
    phone: firstUsableString(person.telephone),
  };
  return Object.entries(values)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

export function parseLinkedInProfile(
  html: string,
  canonicalUrl: string,
  status = 200
): ParsedLinkedInProfile {
  const meta = metaValues(html);
  const person = exactPerson(html, canonicalUrl);
  const title =
    meta.get("og:title") ?? meta.get("twitter:title") ?? documentTitle(html);
  const description =
    meta.get("og:description") ??
    meta.get("twitter:description") ??
    meta.get("description") ??
    "";
  const name = usableString(recordValue(person, "name"));
  const company = currentNamedValue(recordValue(person, "worksFor"));
  const position = currentUsableString(recordValue(person, "jobTitle"));
  const location = personLocation(person);
  const almaMater = firstNamedValue(recordValue(person, "alumniOf"));
  const email = firstUsableString(recordValue(person, "email"));
  const phone = firstUsableString(recordValue(person, "telephone"));
  const candidates = photoCandidates(person, meta);
  const exactPersonSummary = summarizeExactPerson(person);
  const fields: DirectContactFields = { linkedin_url: canonicalUrl };
  if (name) fields.name = name;
  if (company) fields.company = company;
  if (position) fields.position = position;
  if (location) fields.location = location;
  if (almaMater) fields.alma_mater = almaMater;
  if (email) fields.email = email;
  if (phone) fields.phone = phone;

  return {
    access: accessFor(status, html, title, Boolean(person)),
    fields,
    title,
    description,
    exactPersonSummary,
    visibleText: pageText(html),
    photoCandidates: candidates,
    hasExactPerson: Boolean(person),
  };
}
