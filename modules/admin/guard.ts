import { redirect } from 'next/navigation';

import { getAdminSessionFromCookies } from './auth';
import { canAdmin, type AdminAction } from './authorization';

/**
 * Gate for admin Server Component pages: redirects to /admin/login when no
 * session exists, or to /admin when the signed-in admin lacks `action`.
 * Always call this before reading or rendering any admin-only data.
 */
export async function requireAdminPage(action?: AdminAction) {
  const admin = await getAdminSessionFromCookies();
  if (!admin) redirect('/admin/login');
  if (action && !canAdmin(admin.role, action)) redirect('/admin');
  return admin;
}
