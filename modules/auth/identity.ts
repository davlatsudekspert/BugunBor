import { ensureDatabase, getDb } from '@/db/runtime';

export type RequestIdentity = {
  id: string;
  email: string | null;
  role:
    | 'CUSTOMER'
    | 'BUSINESS_OWNER'
    | 'BUSINESS_STAFF'
    | 'MODERATOR'
    | 'ADMIN'
    | 'SUPER_ADMIN';
};

export async function getRequestIdentity(
  request: Request,
): Promise<RequestIdentity | null> {
  const externalId = request.headers.get('oai-authenticated-user-id');
  const email = request.headers.get('oai-authenticated-user-email');

  const isLocal = new URL(request.url).hostname === 'localhost';
  const demoUser = isLocal ? request.headers.get('x-bugunbor-demo-user') : null;
  const id = externalId ? `oai_${externalId}` : demoUser;
  if (!id) return null;

  const role = demoUser?.includes('admin')
    ? 'ADMIN'
    : demoUser?.includes('moderator')
      ? 'MODERATOR'
      : demoUser?.includes('owner')
        ? 'BUSINESS_OWNER'
        : 'CUSTOMER';

  await ensureDatabase();
  await getDb()
    .prepare(`INSERT INTO users(id, role, email, display_name)
      VALUES (?1, ?2, ?3, ?4)
      ON CONFLICT(id) DO UPDATE SET email = excluded.email, updated_at = CURRENT_TIMESTAMP`)
    .bind(id, role, email, email?.split('@')[0] ?? 'BugunBor foydalanuvchisi')
    .run();

  // Local-only convenience: the demo header encodes the intended role in the id
  // itself (…owner…, …moderator…, …admin…), so keep it in sync on every request.
  // A real OAuth-authenticated user's role is never touched here — that stays
  // whatever an admin set it to.
  if (isLocal && demoUser) {
    await getDb()
      .prepare(
        'UPDATE users SET role = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND role != ?1',
      )
      .bind(role, id)
      .run();
  }

  const stored = await getDb()
    .prepare('SELECT role FROM users WHERE id = ?1')
    .bind(id)
    .first<{ role: RequestIdentity['role'] }>();
  return { id, email, role: stored?.role ?? role };
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const requestUrl = new URL(request.url);
  const originUrl = new URL(origin);
  if (
    originUrl.host !== requestUrl.host ||
    originUrl.protocol !== requestUrl.protocol
  ) {
    throw new Error('CSRF_ORIGIN_MISMATCH');
  }
}
