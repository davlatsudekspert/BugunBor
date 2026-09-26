import { getDb } from '@/db/client';
import { isSecureRequest, readCookie, serializeCookie } from '@/lib/cookies';
import { safeReturnPath } from '@/lib/http';
import { SESSION_COOKIE, getSessionUser } from '@/modules/auth/sessions';
import { BUSINESS_COOKIE } from '@/modules/businesses/current';

// GET /business/switch/<id>?next=/business/deals — remembers which business the workspace shows.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const next = safeReturnPath(url.searchParams.get('next'), '/business/dashboard');
  const headers = new Headers({ location: next, 'cache-control': 'no-store' });
  const db = await getDb();
  const user = await getSessionUser(db, readCookie(request, SESSION_COOKIE));
  if (user) {
    const member = await db.prepare(`SELECT 1 FROM business_members WHERE business_id = ?1 AND user_id = ?2 AND revoked_at IS NULL`).bind(id, user.id).first();
    if (member) headers.append('set-cookie', serializeCookie(BUSINESS_COOKIE, id, { maxAge: 365 * 24 * 60 * 60, secure: isSecureRequest(request) }));
  }
  return new Response(null, { status: 303, headers });
}
