import { getDb } from '@/db/client';
import { getConfig } from '@/lib/env';
import { json, route } from '@/lib/http';
import { toDbTime } from '@/lib/time';
import { optionalApiUser } from '@/modules/auth/api-user';
import { getDealBySlug, getFavoriteIds } from '@/modules/catalog/queries';
import { demoEnabled } from '@/modules/demo';
import { followState } from '@/modules/engagement/follows';
import { DomainError } from '@/modules/errors';

// One public deal (by slug) with what the signed-in customer can do with it.
export const GET = route(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const { id: slug } = await context.params;
  const db = await getDb();
  const [user, demo] = await Promise.all([optionalApiUser(request, db), demoEnabled(db)]);
  const deal = await getDealBySlug(db, slug, { demo });
  if (!deal || !deal.isPublic) throw new DomainError('NOT_FOUND');
  const now = new Date();
  const [favorites, usage, follow] = await Promise.all([
    user ? getFavoriteIds(db, user.id) : Promise.resolve(new Set<string>()),
    user
      ? db.prepare(`SELECT MAX(CASE WHEN status = 'CLAIMED' AND expires_at > ?3 THEN id END) AS activeId,
            SUM(CASE WHEN status = 'COMPLETED' OR (status = 'CLAIMED' AND expires_at > ?3) THEN 1 ELSE 0 END) AS used
          FROM redemptions WHERE deal_id = ?1 AND user_id = ?2`).bind(deal.id, user.id, toDbTime(now)).first<{ activeId: string | null; used: number | null }>()
      : Promise.resolve(null),
    followState(db, deal.business.id, user?.id ?? null),
  ]);
  const isDemo = deal.isDemo || deal.business.isDemo;
  const claimable = deal.effective === 'LIVE' && deal.business.onAir && !(isDemo && !getConfig().isDevelopment);
  const { rejectionReason: _rejectionReason, viewCount: _viewCount, status: _status, isPublic: _isPublic, ...visible } = deal;
  return json({
    data: {
      ...visible,
      isDemo,
      claimable,
      favorite: favorites.has(deal.id),
      following: follow.following,
      followers: follow.followers,
      usedCount: usage?.used ?? 0,
      activeRedemptionId: usage?.activeId ?? null,
    },
  });
});
