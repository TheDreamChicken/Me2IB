import assert from "node:assert/strict";
import test from "node:test";
import { persistPhoto, storedPhoto } from "./photo-storage.ts";

function fakeSupabase({ infoData = null, infoError = null, uploadError = null } = {}) {
  const calls = { bucket: null, infoPath: null, upload: null };
  return {
    calls,
    client: {
      storage: {
        from(bucket) {
          calls.bucket = bucket;
          return {
            async info(path) {
              calls.infoPath = path;
              return { data: infoData, error: infoError };
            },
            async upload(path, bytes, options) {
              calls.upload = { path, bytes, options };
              return { data: uploadError ? null : { path }, error: uploadError };
            },
            getPublicUrl(path) {
              return {
                data: {
                  publicUrl: `https://example.supabase.co/storage/v1/object/public/avatars/${path}`,
                },
              };
            },
          };
        },
      },
    },
  };
}

const PROFILE = new URL("https://www.linkedin.com/in/private-vanity-slug");
const USER_ID = "00000000-0000-4000-8000-000000000001";

test("persists validated bytes to a deterministic, non-identifying user path", async () => {
  const fake = fakeSupabase();
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const url = await persistPhoto(
    fake.client,
    USER_ID,
    PROFILE,
    { bytes, contentType: "image/jpeg", sourceUrl: "https://media.licdn.com/photo" },
    "unavatar"
  );

  assert.equal(fake.calls.bucket, "avatars");
  assert.match(
    fake.calls.upload.path,
    new RegExp(`^${USER_ID}/contacts/linkedin-[0-9a-f]{40}$`)
  );
  assert.doesNotMatch(fake.calls.upload.path, /private-vanity-slug/);
  assert.equal(fake.calls.upload.options.upsert, true);
  assert.equal(fake.calls.upload.options.metadata.source, "unavatar");
  assert.equal(new URL(url).searchParams.get("source"), "unavatar");
});

test("reuses a fresh stored photo and preserves its recorded source", async () => {
  const fake = fakeSupabase({
    infoData: {
      etag: "content-etag",
      lastModified: new Date().toISOString(),
      metadata: { source: "unavatar" },
    },
  });
  const result = await storedPhoto(fake.client, USER_ID, PROFILE);

  assert.equal(result?.fresh, true);
  assert.equal(result?.source, "unavatar");
  assert.equal(new URL(result.url).searchParams.get("source"), "unavatar");
  assert.match(fake.calls.infoPath, /\/contacts\/linkedin-[0-9a-f]{40}$/);
});

test("keeps a stale stored copy available when upstream refresh fails", async () => {
  const fake = fakeSupabase({
    infoData: {
      etag: "older-content",
      lastModified: new Date(Date.now() - 48 * 60 * 60_000).toISOString(),
      metadata: { source: "linkedin" },
    },
  });
  const result = await storedPhoto(fake.client, USER_ID, PROFILE);

  assert.equal(result?.fresh, false);
  assert.equal(result?.source, "linkedin");
  assert.ok(result?.url);
});
