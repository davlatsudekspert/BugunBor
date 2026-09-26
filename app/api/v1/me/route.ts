import { z } from 'zod';

import { getDb } from '@/db/client';
import { isSecureRequest } from '@/lib/cookies';
import { assertSameOrigin, json, readJson, route } from '@/lib/http';
import { PRIVACY_VERSION } from '@/lib/privacy';
import {
  accountStats, deleteAccount, getNotificationSettings, setNotifyNearby, setUserLocale, soleOwnedBusinesses, updateDisplayName, updateNotificationSettings,
} from '@/modules/auth/account';
import { apiUser } from '@/modules/auth/api-user';
import { clearSessionCookie } from '@/modules/auth/sessions';
import { listMemberships } from '@/modules/businesses/access';
import { listBlockedBusinessIds } from '@/modules/engagement/blocks';
import { getInterests } from '@/modules/engagement/interests';

// The signed-in customer: profile, savings, notification switches, interests,
// blocked businesses and the businesses they work for (for the cashier screen).
export const GET = route(async (request: Request) => {
  const db = await getDb();
  const user = await apiUser(request, db);
  const [stats, notifications, interests, blocked, memberships, account] = await Promise.all([
    accountStats(db, user.id),
    getNotificationSettings(db, user.id),
    getInterests(db, user.id),
    listBlockedBusinessIds(db, user.id),
    listMemberships(db, user.id),
    db.prepare(`SELECT privacy_version AS version, telegram_username AS telegramUsername FROM users WHERE id = ?1`)
      .bind(user.id)
      .first<{ version: string | null; telegramUsername: string | null }>(),
  ]);
  return json({
    data: {
      user: { id: user.id, displayName: user.displayName, phone: user.phone, locale: user.locale, role: user.role, telegramUsername: account?.telegramUsername ?? null },
      stats,
      notifications,
      interests,
      blockedBusinessIds: blocked,
      // `status` is the review state (PENDING, VERIFIED, REJECTED); `verified` also needs the business not suspended.
      memberships: memberships.map((m) => ({
        businessId: m.businessId, name: m.name, slug: m.slug, role: m.role, status: m.verificationStatus, verified: m.verificationStatus === 'VERIFIED' && !m.suspendedAt,
      })),
      privacy: { acceptedVersion: account?.version ?? null, currentVersion: PRIVACY_VERSION },
    },
  });
});

const patchSchema = z.object({
  displayName: z.string().trim().min(2).max(60).optional(),
  locale: z.enum(['uz', 'ru']).optional(),
  notifyDeals: z.boolean().optional(),
  notifyReminders: z.boolean().optional(),
  notifyNearby: z.boolean().optional(),
});

export const PATCH = route(async (request: Request) => {
  assertSameOrigin(request);
  const body = await readJson(request, patchSchema);
  const db = await getDb();
  const user = await apiUser(request, db);
  if (body.displayName !== undefined) await updateDisplayName(db, user.id, body.displayName);
  if (body.locale !== undefined) await setUserLocale(db, user.id, body.locale);
  if (body.notifyDeals !== undefined || body.notifyReminders !== undefined) {
    await updateNotificationSettings(db, user.id, { notifyDeals: body.notifyDeals, notifyReminders: body.notifyReminders });
  }
  if (body.notifyNearby !== undefined) await setNotifyNearby(db, user.id, body.notifyNearby);
  return json({ data: { ok: true } });
});

const deleteSchema = z.object({ closeBusinesses: z.boolean().optional() });

export const DELETE = route(async (request: Request) => {
  assertSameOrigin(request);
  // The body is optional: {"closeBusinesses": true} also closes businesses only this person owns.
  const body = (request.headers.get('content-type') ?? '').includes('application/json') ? await readJson(request, deleteSchema) : {};
  const db = await getDb();
  const user = await apiUser(request, db);
  const closing = body.closeBusinesses ? await soleOwnedBusinesses(db, user.id) : [];
  await deleteAccount(db, user.id, new Date(), { closeBusinesses: body.closeBusinesses });
  return json({ data: { deleted: true, closedBusinesses: closing } }, { headers: { 'set-cookie': clearSessionCookie(isSecureRequest(request)) } });
});
