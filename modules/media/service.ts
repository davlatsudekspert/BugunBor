import { mediaUrl } from '@/lib/photos';
import { toDbTime } from '@/lib/time';
import { DomainError } from '@/modules/errors';

// Original photos uploaded by businesses. Browsers resize and re-encode them
// to WebP before upload (see components/business/photo-picker.tsx); the
// server only accepts real image bytes within size and dimension limits.

export const MEDIA_KINDS = ['DEAL', 'LOGO', 'COVER'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const MEDIA_RULES = {
  maxBytes: 700_000,
  maxSide: 4096,
  minSide: 64,
  maxPerBusiness: 300,
} as const;

export type ImageType = 'image/webp' | 'image/jpeg' | 'image/png';

const MEDIA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const isMediaId = (value: string) => MEDIA_ID.test(value);

/** Detects the image format from its first bytes; the declared type is never trusted. */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'image/webp';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte)) return 'image/png';
  return null;
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

/** Pixel size from the image header, or null when it cannot be read. */
export function imageSize(bytes: Uint8Array, type: ImageType): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    if (type === 'image/png') return { width: view.getUint32(16), height: view.getUint32(20) };
    if (type === 'image/webp') {
      const chunk = ascii(bytes, 12, 4);
      if (chunk === 'VP8 ') return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
      if (chunk === 'VP8L') {
        const b1 = bytes[22], b2 = bytes[23], b3 = bytes[24];
        return { width: 1 + (((b1 & 0x3f) << 8) | bytes[21]), height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
      }
      if (chunk === 'VP8X') {
        const uint24 = (offset: number) => bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
        return { width: 1 + uint24(24), height: 1 + uint24(27) };
      }
      return null;
    }
    // JPEG: walk the segments to the first start-of-frame marker.
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1];
      const length = view.getUint16(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) };
      }
      offset += 2 + length;
    }
    return null;
  } catch {
    return null;
  }
}

export function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

export function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function sha256(bytes: Uint8Array<ArrayBuffer>) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Validates and stores an uploaded image for a business. */
export async function saveMedia(db: D1Database, input: { businessId: string; userId: string; kind: MediaKind; bytes: Uint8Array<ArrayBuffer> }, now = new Date()) {
  const { bytes } = input;
  if (bytes.length === 0 || bytes.length > MEDIA_RULES.maxBytes) throw new DomainError('IMAGE_TOO_LARGE', 413);
  const mime = detectImageType(bytes);
  if (!mime) throw new DomainError('IMAGE_INVALID', 415);
  const size = imageSize(bytes, mime);
  if (!size || size.width < MEDIA_RULES.minSide || size.height < MEDIA_RULES.minSide || size.width > MEDIA_RULES.maxSide || size.height > MEDIA_RULES.maxSide) {
    throw new DomainError('IMAGE_INVALID', 415);
  }
  const count = await db.prepare(`SELECT COUNT(*) AS n FROM media WHERE business_id = ?1`).bind(input.businessId).first<{ n: number }>();
  if ((count?.n ?? 0) >= MEDIA_RULES.maxPerBusiness) throw new DomainError('RATE_LIMITED', 429);

  const id = crypto.randomUUID();
  await db
    .prepare(`INSERT INTO media(id, business_id, kind, mime, data_base64, size, width, height, sha256, uploaded_by, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`)
    .bind(id, input.businessId, input.kind, mime, bytesToBase64(bytes), bytes.length, size.width, size.height, await sha256(bytes), input.userId, toDbTime(now))
    .run();
  return { id, url: mediaUrl(id)!, width: size.width, height: size.height };
}

export async function getMedia(db: D1Database, id: string) {
  if (!isMediaId(id)) return null;
  const row = await db
    .prepare(`SELECT mime, data_base64 AS data, sha256 FROM media WHERE id = ?1`)
    .bind(id)
    .first<{ mime: ImageType; data: string; sha256: string }>();
  return row ? { mime: row.mime, bytes: base64ToBytes(row.data), etag: `"${row.sha256}"` } : null;
}

/** A photo id sent with a deal or profile must belong to that business. */
export async function assertOwnMedia(db: D1Database, businessId: string, mediaId: string | null | undefined) {
  if (!mediaId) return;
  if (!isMediaId(mediaId)) throw new DomainError('VALIDATION');
  const row = await db.prepare(`SELECT id FROM media WHERE id = ?1 AND business_id = ?2`).bind(mediaId, businessId).first();
  if (!row) throw new DomainError('VALIDATION');
}

/** Uploads never attached to a deal or profile within a day are removed. */
export function pruneOrphanMediaStatement(db: D1Database, now: Date) {
  const dayAgo = toDbTime(new Date(now.getTime() - 24 * 60 * 60_000));
  return db
    .prepare(`DELETE FROM media WHERE created_at < ?1
      AND id NOT IN (SELECT photo_id FROM deals WHERE photo_id IS NOT NULL)
      AND id NOT IN (SELECT logo_id FROM businesses WHERE logo_id IS NOT NULL)
      AND id NOT IN (SELECT cover_id FROM businesses WHERE cover_id IS NOT NULL)`)
    .bind(dayAgo);
}
