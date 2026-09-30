import { notFound, redirect } from 'next/navigation';

import { AdminSecurity } from '@/components/admin/admin-security';
import { getDb } from '@/db/client';
import { safeReturnPath } from '@/lib/http';
import { getI18n } from '@/lib/i18n/server';
import { firstValues } from '@/lib/search-params';
import { requireUser } from '@/modules/auth/current';
import { adminSessionVerified, adminSetupNeedsLogin, factorEnabled, isAdminOwner } from '@/modules/auth/admin-mfa';

export const metadata = { title: 'Admin — Authenticator', robots: { index: false, follow: false } };

export default async function AdminSecurityPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const user = await requireUser('/admin/security');
  if (!isAdminOwner(user)) notFound();
  const target = safeReturnPath(firstValues(await searchParams).returnTo, '/admin');
  const returnTo = target === '/admin' || target.startsWith('/admin/') && !target.startsWith('/admin/security') ? target : '/admin';
  const db = await getDb();
  if (await adminSessionVerified(db, user)) redirect(returnTo);
  const enabled = await factorEnabled(db, user.id);
  const reauthenticate = adminSetupNeedsLogin(user, enabled);
  const { locale } = await getI18n();
  return <AdminSecurity enabled={enabled} reauthenticate={reauthenticate} returnTo={returnTo} locale={locale === 'ru' ? 'ru' : 'uz'} />;
}
