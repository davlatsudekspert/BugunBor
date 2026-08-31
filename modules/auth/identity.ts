import { headers } from 'next/headers';

import { ensurePhase1Database, getD1 } from '@/db/runtime';

export type RequestIdentity = {
  id: string;
  email: string | null;
  role: 'CUSTOMER' | 'BUSINESS_OWNER' | 'BUSINESS_STAFF' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
};

type HeaderSource = { get(name: string): string | null };

async function resolveIdentity(source: HeaderSource, hostname: string): Promise<RequestIdentity | null> {
  const externalId = source.get('oai-authenticated-user-id');
  const email = source.get('oai-authenticated-user-email');

  const isLocal = hostname === 'localhost';
  const demoUser = isLocal ? source.get('x-bugunbor-demo-user') : null;
  const id = externalId ? `oai_${externalId}` : demoUser;
  if (!id) return null;

  const role = demoUser?.includes('moderator')
    ? 'MODERATOR'
    : demoUser?.includes('owner')
      ? 'BUSINESS_OWNER'
      : 'CUSTOMER';

  await ensurePhase1Database();
  await getD1()
    .prepare(`INSERT INTO users(id, role, email, display_name)
      VALUES (?1, ?2, ?3, ?4)
      ON CONFLICT(id) DO UPDATE SET email = excluded.email, updated_at = CURRENT_TIMESTAMP`)
    .bind(id, role, email, email?.split('@')[0] ?? 'BugunBor foydalanuvchisi')
    .run();

  const stored = await getD1().prepare('SELECT role FROM users WHERE id = ?1').bind(id).first<{ role: RequestIdentity['role'] }>();
  return { id, email, role: stored?.role ?? role };
}

/** Identify the caller of an API route handler from its raw `Request`. */
export async function getRequestIdentity(request: Request): Promise<RequestIdentity | null> {
  return resolveIdentity(request.headers, new URL(request.url).hostname);
}

/**
 * Identify the current visitor inside a Server Component, where no raw
 * `Request` is available. Reads the same headers `getRequestIdentity` reads
 * for API routes, via `next/headers`, so page-level access checks stay
 * consistent with the checks already enforced on the underlying API routes.
 */
export async function getServerIdentity(): Promise<RequestIdentity | null> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? '';
  return resolveIdentity(requestHeaders, host.split(':')[0] ?? '');
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const requestUrl = new URL(request.url);
  const originUrl = new URL(origin);
  if (originUrl.host !== requestUrl.host || originUrl.protocol !== requestUrl.protocol) {
    throw new Error('CSRF_ORIGIN_MISMATCH');
  }
}
