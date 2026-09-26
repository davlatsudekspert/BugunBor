import { getDb } from '@/db/client';
import { assertSameOrigin, json, route } from '@/lib/http';
import { apiUser } from '@/modules/auth/api-user';
import { requireMembership } from '@/modules/businesses/access';
import { DomainError } from '@/modules/errors';
import { MEDIA_KINDS, MEDIA_RULES, saveMedia, type MediaKind } from '@/modules/media/service';
import { RATE_RULES, enforceRateLimit } from '@/modules/rate-limit';

const isKind = (value: unknown): value is MediaKind => typeof value === 'string' && (MEDIA_KINDS as readonly string[]).includes(value);

// Multipart upload of one already-compressed image: fields `file` and `kind`.
export const POST = route(async (request: Request, context: { params: Promise<{ businessId: string }> }) => {
  assertSameOrigin(request);
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MEDIA_RULES.maxBytes + 64_000) throw new DomainError('IMAGE_TOO_LARGE', 413);
  const db = await getDb();
  const user = await apiUser(request, db);
  const { businessId } = await context.params;
  const form = await request.formData().catch(() => null);
  const kind = form?.get('kind');
  const file = form?.get('file');
  if (!isKind(kind) || !(file instanceof Blob)) throw new DomainError('VALIDATION', 400);
  await requireMembership(db, user.id, businessId, kind === 'DEAL' ? 'deal.write' : 'business.edit');
  await enforceRateLimit(db, `media:${user.id}`, RATE_RULES.write);
  if (file.size > MEDIA_RULES.maxBytes) throw new DomainError('IMAGE_TOO_LARGE', 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  return json({ data: await saveMedia(db, { businessId, userId: user.id, kind, bytes }) }, { status: 201 });
});
