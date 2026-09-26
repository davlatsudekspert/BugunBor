import { readCookie } from '@/lib/cookies';
import { bearerToken } from '@/lib/http';
import { DomainError } from '@/modules/errors';
import { SESSION_COOKIE, getSessionUser } from './sessions';

// The signed-in user for API route handlers (no Next.js page APIs here, so
// routes can be tested directly). Pages use modules/auth/current.ts.

const isModerator = (role: string) => role === 'MODERATOR' || role === 'ADMIN';

/** The session token of an API request: the site's cookie or the app's bearer token. */
export const requestSessionToken = (request: Request) => readCookie(request, SESSION_COOKIE) ?? bearerToken(request);

/** The signed-in user for API route handlers, or null for guests. */
export async function optionalApiUser(request: Request, db: D1Database) {
  const token = requestSessionToken(request);
  return token ? getSessionUser(db, token) : null;
}

/** The signed-in user for API route handlers. */
export async function apiUser(request: Request, db: D1Database) {
  const user = await optionalApiUser(request, db);
  if (!user) throw new DomainError('UNAUTHENTICATED');
  return user;
}

export async function apiModerator(request: Request, db: D1Database) {
  const user = await apiUser(request, db);
  if (!isModerator(user.role)) throw new DomainError('FORBIDDEN');
  return user;
}

export async function apiAdmin(request: Request, db: D1Database) {
  const user = await apiUser(request, db);
  if (user.role !== 'ADMIN') throw new DomainError('FORBIDDEN');
  return user;
}
