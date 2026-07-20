export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

export type SupportedPhotoType = "image/jpeg" | "image/png" | "image/webp";

export type ValidatedPhoto = {
  bytes: Uint8Array;
  contentType: SupportedPhotoType;
  sourceUrl: string;
};

export type PhotoDimensions = { height: number; width: number };

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

export function sniffPhotoType(bytes: Uint8Array): SupportedPhotoType | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function uint16BigEndian(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function uint24LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function uint32BigEndian(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] * 0x1000000 +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}

export function photoDimensions(
  bytes: Uint8Array,
  type = sniffPhotoType(bytes)
): PhotoDimensions | null {
  if (type === "image/png") {
    if (
      bytes.length < 24 ||
      bytes[12] !== 0x49 ||
      bytes[13] !== 0x48 ||
      bytes[14] !== 0x44 ||
      bytes[15] !== 0x52
    ) {
      return null;
    }
    return {
      width: uint32BigEndian(bytes, 16),
      height: uint32BigEndian(bytes, 20),
    };
  }

  if (type === "image/jpeg") {
    let offset = 2;
    const startOfFrame = new Set([
      0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
      0xcf,
    ]);
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 1 >= bytes.length) break;
      const length = uint16BigEndian(bytes, offset);
      if (length < 2 || offset + length > bytes.length) break;
      if (startOfFrame.has(marker) && length >= 7) {
        return {
          height: uint16BigEndian(bytes, offset + 3),
          width: uint16BigEndian(bytes, offset + 5),
        };
      }
      offset += length;
    }
    return null;
  }

  if (type === "image/webp" && bytes.length >= 25) {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === "VP8X" && bytes.length >= 30) {
      return {
        width: uint24LittleEndian(bytes, 24) + 1,
        height: uint24LittleEndian(bytes, 27) + 1,
      };
    }
    if (
      chunk === "VP8 " &&
      bytes.length >= 30 &&
      bytes[23] === 0x9d &&
      bytes[24] === 0x01 &&
      bytes[25] === 0x2a
    ) {
      return {
        width: (bytes[26] | (bytes[27] << 8)) & 0x3fff,
        height: (bytes[28] | (bytes[29] << 8)) & 0x3fff,
      };
    }
    if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
      return {
        width: 1 + ((bytes[21] | (bytes[22] << 8)) & 0x3fff),
        height:
          1 +
          (((bytes[22] >> 6) | (bytes[23] << 2) | (bytes[24] << 10)) &
            0x3fff),
      };
    }
  }
  return null;
}

export function hasSanePhotoDimensions(
  dimensions: PhotoDimensions | null
): boolean {
  if (!dimensions) return false;
  const { height, width } = dimensions;
  const ratio = Math.max(width / height, height / width);
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width >= 32 &&
    height >= 32 &&
    width <= 8_192 &&
    height <= 8_192 &&
    ratio <= 8
  );
}

export async function validatedPhotoFromResponse(
  response: Response,
  sourceUrl: string,
  maxBytes = MAX_PROFILE_PHOTO_BYTES
): Promise<ValidatedPhoto | null> {
  if (!response.ok) {
    await cancelBody(response);
    return null;
  }
  const declaredType = response.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (
    declaredType !== "image/jpeg" &&
    declaredType !== "image/png" &&
    declaredType !== "image/webp"
  ) {
    await cancelBody(response);
    return null;
  }

  const bytes = await readBoundedBytes(response, maxBytes);
  if (
    !bytes ||
    sniffPhotoType(bytes) !== declaredType ||
    !hasSanePhotoDimensions(photoDimensions(bytes, declaredType))
  ) {
    return null;
  }
  return {
    bytes,
    contentType: declaredType,
    sourceUrl,
  };
}
