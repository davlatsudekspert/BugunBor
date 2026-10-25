import { isAdminOwner } from '@/modules/auth/admin-mfa';
import { apiUser } from '@/modules/auth/api-user';
import { DomainError } from '@/modules/errors';

/**
 * The owner, from the app: a signed-in session that belongs to the approved
 * owner and was opened with Telegram (the phone is what names the owner).
 * Checked again on every call; the site's admin panel keeps its second factor.
 */
export async function appOwner(request: Request, db: D1Database) {
  const user = await apiUser(request, db);
  if (!isAdminOwner(user) || user.authMethod !== 'telegram') throw new DomainError('FORBIDDEN');
  return user;
}
