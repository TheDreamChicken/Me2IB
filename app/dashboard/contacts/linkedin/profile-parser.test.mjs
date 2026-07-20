import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeHtml,
  normalizeLinkedInProfilePhotoUrl,
  normalizeLinkedInProfileUrl,
  parseLinkedInProfile,
} from "./profile-parser.ts";

const PROFILE = "https://www.linkedin.com/in/example-person-123";
const PERSON_PHOTO =
  "https://media.licdn.com/dms/image/v2/D4E03AQ/example/profile-displayphoto-shrink_200_200/example?e=1770000000&v=beta";
const OG_PHOTO =
  "https://media.licdn.com/dms/image/v2/D4E03AQ/example/profile-displayphoto-shrink_400_400/og";
const TWITTER_PHOTO =
  "https://media-exp1.licdn.com/dms/image/v2/D4E03AQ/example/profile-displayphoto-shrink_200_200/twitter";

function profileHtml() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        author: {
          "@type": "Person",
          name: "Example Person",
          url: PROFILE,
        },
        image:
          "https://media.licdn.com/dms/image/v2/article-cover_image-shrink_800_800/example",
      },
      {
        "@type": "Person",
        name: "Wrong Person",
        url: "https://www.linkedin.com/in/wrong-person",
        worksFor: [{ name: "Wrong Company" }],
      },
      {
        "@type": "Person",
        name: "Example Person",
        url: PROFILE,
        sameAs: `${PROFILE}/`,
        address: { addressLocality: "Chicago, Illinois, United States" },
        alumniOf: [{ name: "Example University" }, { name: "****** ******" }],
        image: {
          contentUrl: PERSON_PHOTO.replace("&", "&amp;"),
        },
        jobTitle: ["Senior Analyst", "Former Analyst"],
        worksFor: [{ name: "Example &amp; Company" }, { name: "*****" }],
      },
    ],
  };
  return `<!doctype html>
    <html><head>
      <meta content="Example Person - Example Company | LinkedIn" property="og:title">
      <meta name="description" content="Example Person's public profile">
      <meta property="og:image" content="https://media.licdn.com/dms/image/v2/company-logo_200_200/example">
      <script data-test="yes" type="application/ld+json">${JSON.stringify(graph)}</script>
    </head><body><main>Example Person public profile</main></body></html>`;
}

test("selects the richest exact-URL Person and ignores masked/unrelated records", () => {
  const parsed = parseLinkedInProfile(profileHtml(), PROFILE);

  assert.equal(parsed.access, "public");
  assert.equal(parsed.fields.name, "Example Person");
  assert.equal(parsed.fields.company, "Example & Company");
  assert.equal(parsed.fields.position, "Senior Analyst");
  assert.equal(parsed.fields.location, "Chicago, Illinois, United States");
  assert.equal(parsed.fields.alma_mater, "Example University");
  assert.equal(parsed.fields.linkedin_url, PROFILE);
  assert.equal(parsed.fields.photo_url, undefined);
  assert.equal(parsed.photoCandidates[0], PERSON_PHOTO);
  assert.doesNotMatch(parsed.exactPersonSummary, /Wrong Person|Wrong Company/);
});

test("does not trust OG or Twitter photos without an exact canonical Person", () => {
  const html = `<!doctype html><html><head>
    <meta property="og:image" content="${OG_PHOTO}">
    <meta name="twitter:image" content="${TWITTER_PHOTO}">
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Different Person",
      url: "https://www.linkedin.com/in/different-person",
    })}</script>
  </head><body>Public profile preview</body></html>`;

  const parsed = parseLinkedInProfile(html, PROFILE);

  assert.equal(parsed.hasExactPerson, false);
  assert.deepEqual(parsed.photoCandidates, []);
});

test("ranks the exact Person photo ahead of same-page metadata photos", () => {
  const html = profileHtml().replace(
    '<meta property="og:image" content="https://media.licdn.com/dms/image/v2/company-logo_200_200/example">',
    `<meta property="og:image" content="${OG_PHOTO}">
     <meta name="twitter:image" content="${TWITTER_PHOTO}">`
  );

  const parsed = parseLinkedInProfile(html, PROFILE);

  assert.equal(parsed.hasExactPerson, true);
  assert.deepEqual(parsed.photoCandidates, [
    PERSON_PHOTO,
    OG_PHOTO,
    TWITTER_PHOTO,
  ]);
});

test("leaves a fully masked job title blank", () => {
  const html = profileHtml().replace(
    '"Senior Analyst","Former Analyst"',
    '"********* ******","Former Analyst"'
  );
  const parsed = parseLinkedInProfile(html, PROFILE);
  assert.equal(parsed.fields.position, undefined);
});

test("does not fall through from a masked current company to a former company", () => {
  const html = profileHtml().replace(
    '{"name":"Example &amp; Company"},{"name":"*****"}',
    '{"name":"******** *******"},{"name":"Former Company"}'
  );
  const parsed = parseLinkedInProfile(html, PROFILE);
  assert.equal(parsed.fields.company, undefined);
});

test("rejects partially masked structured identity and contact fields", () => {
  const html = profileHtml()
    .replaceAll('"name":"Example Person"', '"name":"J*** D***"')
    .replace('"name":"Example &amp; Company"', '"name":"F****** C******"')
    .replace('"Senior Analyst"', '"A******"')
    .replace(
      '"image":{',
      '"email":"j***@example.com","telephone":"(***) ***-1234","image":{'
    );
  const parsed = parseLinkedInProfile(html, PROFILE);

  assert.equal(parsed.fields.name, undefined);
  assert.equal(parsed.fields.company, undefined);
  assert.equal(parsed.fields.position, undefined);
  assert.equal(parsed.fields.email, undefined);
  assert.equal(parsed.fields.phone, undefined);
});

test("recognizes an authwall or throttled response without treating it as a profile", () => {
  const html =
    '<html><head><title>Sign Up | LinkedIn</title></head><body class="seo-authwall-base">Join LinkedIn</body></html>';
  const authwall = parseLinkedInProfile(html, PROFILE, 200);
  const blocked = parseLinkedInProfile(html, PROFILE, 999);

  assert.equal(authwall.access, "authwall");
  assert.equal(blocked.access, "blocked");
  assert.deepEqual(authwall.fields, { linkedin_url: PROFILE });
  assert.deepEqual(authwall.photoCandidates, []);

  const throttledWithStalePerson = parseLinkedInProfile(
    profileHtml(),
    PROFILE,
    999
  );
  assert.equal(throttledWithStalePerson.access, "blocked");
  assert.deepEqual(throttledWithStalePerson.fields, { linkedin_url: PROFILE });
  assert.equal(throttledWithStalePerson.exactPersonSummary, "");
  assert.deepEqual(throttledWithStalePerson.photoCandidates, []);
  assert.equal(throttledWithStalePerson.hasExactPerson, false);

  const exactPersonAuthwall = parseLinkedInProfile(
    profileHtml()
      .replace("<main>", '<main class="seo-authwall-base">')
      .replace(
        "<meta content=\"Example Person - Example Company | LinkedIn\" property=\"og:title\">",
        '<meta content="Sign Up | LinkedIn" property="og:title">'
      ),
    PROFILE,
    200
  );
  assert.equal(exactPersonAuthwall.access, "authwall");
  assert.deepEqual(exactPersonAuthwall.fields, { linkedin_url: PROFILE });
  assert.deepEqual(exactPersonAuthwall.photoCandidates, []);
});

test("canonicalizes only strict public LinkedIn profile URLs", () => {
  assert.equal(
    normalizeLinkedInProfileUrl(`${PROFILE}/?trk=public_profile`)?.toString(),
    PROFILE
  );
  assert.equal(
    normalizeLinkedInProfileUrl(
      "https://uk.linkedin.com/in/example-person-123/?trk=public_profile"
    )?.toString(),
    PROFILE
  );
  assert.equal(
    normalizeLinkedInProfileUrl(
      "https://www.linkedin.com/in/Example-Person-123/"
    )?.toString(),
    PROFILE
  );
  for (const invalid of [
    "http://www.linkedin.com/in/example-person-123",
    "https://user:pass@www.linkedin.com/in/example-person-123",
    "https://www.linkedin.com:444/in/example-person-123",
    "https://evil.linkedin.com/in/example-person-123",
    "https://www.linkedin.com/company/example",
    `${PROFILE}/details/experience`,
    "https://www.linkedin.com.evil.test/in/example-person-123",
  ]) {
    assert.equal(normalizeLinkedInProfileUrl(invalid), null, invalid);
  }
});

test("accepts encoded profile photos and rejects logos or lookalike hosts", () => {
  const encoded = PERSON_PHOTO.replace(":", "%3A")
    .replaceAll("/", "%2F")
    .replace("&", "\\u0026");
  assert.equal(normalizeLinkedInProfilePhotoUrl(encoded), PERSON_PHOTO);
  assert.equal(
    normalizeLinkedInProfilePhotoUrl(
      "https://media.licdn.com/dms/image/v2/company-logo_200_200/example"
    ),
    null
  );
  assert.equal(
    normalizeLinkedInProfilePhotoUrl(
      "https://media.licdn.com.evil.test/dms/image/v2/profile-displayphoto-shrink_200_200/example"
    ),
    null
  );
});

test("invalid numeric entities do not crash decoding", () => {
  assert.equal(decodeHtml("before &#99999999; after"), "before &#99999999; after");
  assert.equal(decodeHtml("A&amp;B &#x41;"), "A&B A");
});
