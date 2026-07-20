import assert from "node:assert/strict";
import test from "node:test";
import {
  hasSanePhotoDimensions,
  photoDimensions,
  sniffPhotoType,
  validatedPhotoFromResponse,
} from "./photo-validation.ts";

const JPEG = new Uint8Array([
  0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0xc8, 0x00, 0xc8, 0x03,
  0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00, 0xff, 0xd9,
]);
const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0xc8, 0x00, 0x00, 0x00, 0xc8,
]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x16, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  0x56, 0x50, 0x38, 0x58, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xc7, 0x00, 0x00, 0xc7, 0x00, 0x00,
]);

test("sniffs only the three avatar-bucket image formats", () => {
  assert.equal(sniffPhotoType(JPEG), "image/jpeg");
  assert.equal(sniffPhotoType(PNG), "image/png");
  assert.equal(sniffPhotoType(WEBP), "image/webp");
  assert.equal(sniffPhotoType(new Uint8Array([0x47, 0x49, 0x46, 0x38])), null);
  assert.deepEqual(photoDimensions(JPEG), { width: 200, height: 200 });
  assert.deepEqual(photoDimensions(PNG), { width: 200, height: 200 });
  assert.deepEqual(photoDimensions(WEBP), { width: 200, height: 200 });
});

test("rejects tracking-pixel dimensions", async () => {
  const pixel = new Uint8Array(PNG);
  pixel.set([0x00, 0x00, 0x00, 0x01], 16);
  pixel.set([0x00, 0x00, 0x00, 0x01], 20);
  const rejected = await validatedPhotoFromResponse(
    new Response(pixel, { headers: { "Content-Type": "image/png" } }),
    "https://media.licdn.com/example"
  );
  assert.equal(rejected, null);
});

test("rejects implausible dimensions for manual and fetched photos", () => {
  assert.equal(hasSanePhotoDimensions({ width: 1, height: 1 }), false);
  assert.equal(hasSanePhotoDimensions({ width: 200, height: 200 }), true);
  assert.equal(hasSanePhotoDimensions({ width: 32, height: 257 }), false);
  assert.equal(hasSanePhotoDimensions({ width: 8_193, height: 8_193 }), false);
});

test("accepts a supported image only when MIME and magic bytes agree", async () => {
  const accepted = await validatedPhotoFromResponse(
    new Response(JPEG, { headers: { "Content-Type": "image/jpeg" } }),
    "https://media.licdn.com/example"
  );
  assert.equal(accepted?.contentType, "image/jpeg");
  assert.deepEqual(accepted?.bytes, JPEG);

  const mismatch = await validatedPhotoFromResponse(
    new Response(PNG, { headers: { "Content-Type": "image/jpeg" } }),
    "https://media.licdn.com/example"
  );
  assert.equal(mismatch, null);
});

test("rejects unsupported MIME types and unsuccessful responses", async () => {
  const unsupported = await validatedPhotoFromResponse(
    new Response(JPEG, { headers: { "Content-Type": "image/gif" } }),
    "https://media.licdn.com/example"
  );
  const unsuccessful = await validatedPhotoFromResponse(
    new Response(JPEG, {
      status: 404,
      headers: { "Content-Type": "image/jpeg" },
    }),
    "https://media.licdn.com/example"
  );
  assert.equal(unsupported, null);
  assert.equal(unsuccessful, null);
});

test("enforces the actual streamed byte cap even without Content-Length", async () => {
  const oversized = await validatedPhotoFromResponse(
    new Response(JPEG, { headers: { "Content-Type": "image/jpeg" } }),
    "https://media.licdn.com/example",
    JPEG.byteLength - 1
  );
  assert.equal(oversized, null);
});
