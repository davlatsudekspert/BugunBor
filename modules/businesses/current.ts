import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getDb } from '@/db/client';
import { getI18n } from '@/lib/i18n/server';
import { roleCan, type BusinessAction } from '@/modules/auth/authorization';
import { requireUser } from '@/modules/auth/current';
import { loadSubscription } from '@/modules/billing/service';
import { listMemberships, type Membership } from './access';

export const BUSINESS_COOKIE = 'bb_business';

/**
 * Loads the business workspace for a page: the signed-in member, the selected
 * business (remembered in a cookie) and its subscription. Members without the
 * page's permission go to the page they can use.
 */
export async function requireWorkspace(path: string, action: BusinessAction = 'business.read') {
  const user = await requireUser(path);
  const [db, { t, locale }] = await Promise.all([getDb(), getI18n()]);
  const memberships = await listMemberships(db, user.id);
  if (!memberships.length) redirect('/business/onboarding');
  const selectedId = (await cookies()).get(BUSINESS_COOKIE)?.value;
  const membership: Membership = memberships.find((item) => item.businessId === selectedId) ?? memberships[0];
  if (!roleCan(membership.role, action)) redirect(roleCan(membership.role, 'analytics.read') ? '/business/dashboard' : '/business/redeem');
  const subscription = await loadSubscription(db, membership.businessId);
  return { user, db, t, locale, memberships, membership, subscription };
}

export type Workspace = Awaited<ReturnType<typeof requireWorkspace>>;
