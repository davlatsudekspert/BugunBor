import { toDbTime } from '@/lib/time';
import { DomainError } from '@/modules/errors';
import { MEDIA_RULES, base64ToBytes, bytesToBase64, detectImageType, imageSize, type ImageType } from '@/modules/media/service';

// A person's optional profile photo. Only its owner sees it (the site's
// account page and header, the app's Profile); it is never on a public page,
// so it is kept apart from the public `media` photos and goes with the account.

export const AVATAR_PATH = '/api/v1/me/avatar';
/** Phones and browsers send it at most 512 px wide, well under this. */
export const AVATAR_MAX_BYTES = 300_000;

/** The photo's address for its owner; `v` changes with every new photo, so caches refresh. */
export const avatarUrl = (sha256: string) => `${AVATAR_PATH}?v=${sha256.slice(0, 16)}`;

async function digest(bytes: Uint8Array<ArrayBuffer>) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Checks the image like any upload and replaces the person's photo; returns its address. */
export async function saveAvatar(db: D1Database, userId: string, bytes: Uint8Array<ArrayBuffer>, now = new Date()) {
  if (bytes.length === 0 || bytes.length > AVATAR_MAX_BYTES) throw new DomainError('IMAGE_TOO_LARGE', 413);
  const mime = detectImageType(bytes);
  if (!mime) throw new DomainError('IMAGE_INVALID', 415);
  const size = imageSize(bytes, mime);
  if (!size || size.width < MEDIA_RULES.minSide || size.height < MEDIA_RULES.minSide || size.width > MEDIA_RULES.maxSide || size.height > MEDIA_RULES.maxSide) {
    throw new DomainError('IMAGE_INVALID', 415);
  }
  const sha256 = await digest(bytes);
  await db
    .prepare(`INSERT INTO user_avatars(user_id, mime, data_base64, size, width, height, sha256, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
      ON CONFLICT(user_id) DO UPDATE SET mime = excluded.mime, data_base64 = excluded.data_base64, size = excluded.size,
        width = excluded.width, height = excluded.height, sha256 = excluded.sha256, created_at = excluded.created_at`)
    .bind(userId, mime, bytesToBase64(bytes), bytes.length, size.width, size.height, sha256, toDbTime(now))
    .run();
  return avatarUrl(sha256);
}

export const removeAvatarStatement = (db: D1Database, userId: string) => db.prepare(`DELETE FROM user_avatars WHERE user_id = ?1`).bind(userId);

export async function removeAvatar(db: D1Database, userId: string) {
  await removeAvatarStatement(db, userId).run();
}

export async function getAvatar(db: D1Database, userId: string) {
  const row = await db
    .prepare(`SELECT mime, data_base64 AS data, sha256 FROM user_avatars WHERE user_id = ?1`)
    .bind(userId)
    .first<{ mime: ImageType; data: string; sha256: string }>();
  return row ? { mime: row.mime, bytes: base64ToBytes(row.data), etag: `"${row.sha256}"` } : null;
}
