import { cache } from 'react';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { getDb } from '@/db/client';
import { adminSessionVerified, isAdminOwner } from './admin-mfa';
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

export function isModerator(user: Pick<SessionUser, 'role' | 'adminOwner'> | null) {
  return isAdminOwner(user);
}

export async function requireModerator(returnTo: string) {
  const user = await requireUser(returnTo);
  if (!isAdminOwner(user)) notFound();
  if (!await adminSessionVerified(await getDb(), user)) redirect(`/admin/security?returnTo=${encodeURIComponent(returnTo)}`);
  return user;
}

export async function requireAdmin(returnTo: string) {
  return requireModerator(returnTo);
}

export { apiAdmin, apiModerator, apiUser, optionalApiUser, requestSessionToken } from './api-user';
