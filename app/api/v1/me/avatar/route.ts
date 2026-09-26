import { getDb } from '@/db/client';
import { assertSameOrigin, json, route } from '@/lib/http';
import { apiUser } from '@/modules/auth/api-user';
import { AVATAR_MAX_BYTES, getAvatar, removeAvatar, saveAvatar } from '@/modules/auth/avatar';
import { DomainError } from '@/modules/errors';
import { RATE_RULES, enforceRateLimit } from '@/modules/rate-limit';

// The signed-in person's own profile photo: only they can load it.
export const GET = route(async (request: Request) => {
  const db = await getDb();
  const user = await apiUser(request, db);
  const avatar = await getAvatar(db, user.id);
  if (!avatar) return new Response(null, { status: 404, headers: { 'cache-control': 'private, no-store' } });
  const headers = {
    'content-type': avatar.mime,
    etag: avatar.etag,
    // Personal: never kept by shared caches. The address changes with each new photo.
    'cache-control': 'private, max-age=86400',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
  };
  if (request.headers.get('if-none-match') === avatar.etag) return new Response(null, { status: 304, headers });
  return new Response(avatar.bytes, { headers });
});

// Multipart upload of one already-compressed image in `file`; replaces the old photo.
export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  if (Number(request.headers.get('content-length') ?? 0) > AVATAR_MAX_BYTES + 64_000) throw new DomainError('IMAGE_TOO_LARGE', 413);
  const db = await getDb();
  const user = await apiUser(request, db);
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof Blob)) throw new DomainError('VALIDATION', 400);
  await enforceRateLimit(db, `avatar:${user.id}`, RATE_RULES.write);
  if (file.size > AVATAR_MAX_BYTES) throw new DomainError('IMAGE_TOO_LARGE', 413);
  const avatar = await saveAvatar(db, user.id, new Uint8Array(await file.arrayBuffer()));
  return json({ data: { avatar } }, { status: 201 });
});

export const DELETE = route(async (request: Request) => {
  assertSameOrigin(request);
  const db = await getDb();
  const user = await apiUser(request, db);
  await removeAvatar(db, user.id);
  return json({ data: { ok: true } });
});
