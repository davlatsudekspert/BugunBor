import { getDb } from '@/db/client';
import { isSecureRequest, readCookie, serializeCookie } from '@/lib/cookies';
import { safeReturnPath } from '@/lib/http';
import { LOCALE_COOKIE, isLocale } from '@/lib/i18n';
import { SESSION_COOKIE, getSessionUser } from '@/modules/auth/sessions';

// GET /lang/ru?next=/discover — remembers the language and returns to the page.
export async function GET(request: Request, context: { params: Promise<{ locale: string }> }) {
  const { locale } = await context.params;
  const url = new URL(request.url);
  const next = safeReturnPath(url.searchParams.get('next'), '/');
  const headers = new Headers({ location: next, 'cache-control': 'no-store' });
  if (isLocale(locale)) {
    headers.append('set-cookie', serializeCookie(LOCALE_COOKIE, locale, { maxAge: 365 * 24 * 60 * 60, httpOnly: false, secure: isSecureRequest(request) }));
    const token = readCookie(request, SESSION_COOKIE);
    if (token) {
      const db = await getDb();
      const user = await getSessionUser(db, token);
      if (user && user.locale !== locale) await db.prepare(`UPDATE users SET locale = ?2 WHERE id = ?1`).bind(user.id, locale).run();
    }
  }
  return new Response(null, { status: 303, headers });
}
