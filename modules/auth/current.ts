import { cache } from 'react';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { getDb } from '@/db/client';
import { readCookie } from '@/lib/cookies';
import { DomainError } from '@/modules/errors';
import { SESSION_COOKIE, getSessionUser, type SessionUser } from './sessions';

/** The signed-in user for server components, cached per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionUser(await getDb(), token);
});

export async function requireUser(returnTo: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  return user;
}

export function isModerator(user: Pick<SessionUser, 'role'> | null) {
  return user?.role === 'MODERATOR' || user?.role === 'ADMIN';
}

export async function requireModerator(returnTo: string) {
  const user = await requireUser(returnTo);
  if (!isModerator(user)) notFound();
  return user;
}

export async function requireAdmin(returnTo: string) {
  const user = await requireUser(returnTo);
  if (user.role !== 'ADMIN') notFound();
  return user;
}

/** The signed-in user for API route handlers. */
export async function apiUser(request: Request, db: D1Database) {
  const user = await getSessionUser(db, readCookie(request, SESSION_COOKIE));
  if (!user) throw new DomainError('UNAUTHENTICATED');
  return user;
}

export async function apiModerator(request: Request, db: D1Database) {
  const user = await apiUser(request, db);
  if (!isModerator(user)) throw new DomainError('FORBIDDEN');
  return user;
}

export async function apiAdmin(request: Request, db: D1Database) {
  const user = await apiUser(request, db);
  if (user.role !== 'ADMIN') throw new DomainError('FORBIDDEN');
  return user;
}
