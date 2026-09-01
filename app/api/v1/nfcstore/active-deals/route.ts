import { NextResponse } from 'next/server';

import { ensurePhase1Database, getD1, syncDealLifecycle } from '@/db/runtime';
import { validateNfcStoreProfileUrl } from '@/lib/nfcstore';

type ActiveDealForNfcStore = {
  dealId: string;
  title: string;
  imageUrl: string | null;
  originalPriceUzs: number | null;
  discountedPriceUzs: number;
  discountPercent: number;
  remainingQuantity: number | null;
  endsAt: string;
  bugunborUrl: string;
};

/**
 * What a NFCStore Business profile page calls to render its own "🔥 BugunBor aksiyalari"
 * block — BugunBor stays the single source of truth for price/quantity/timing (NFCStore only
 * displays this, it can't edit it; editing happens in the BugunBor business cabinet). No
 * webhook or cache: a plain, uncached, live query against the same tables the public site
 * itself reads already reflects a deal ending, selling out, or being stopped within the same
 * request that would show it anywhere else — nothing extra to build for that here.
 *
 * Public and unauthenticated, same trust level as GET /api/v1/deals (this is already public
 * marketplace data). Gated on the business's NFCStore link being VERIFIED — not merely
 * present — so a not-yet-confirmed connection can't already leak a business's deals
 * externally, and gated on the business's own BugunBor verification still holding, in case it
 * was suspended after a deal went live. A URL matching no verified business returns the same
 * empty list as one that doesn't exist at all, rather than a 404, so this can't be used to
 * probe which NFCStore URLs are and aren't connected to a BugunBor account.
 */
export async function GET(request: Request) {
  const profileUrl = new URL(request.url).searchParams.get('profileUrl');
  if (!profileUrl) return NextResponse.json({ error: { message: 'profileUrl talab qilinadi.' } }, { status: 422 });

  const validation = validateNfcStoreProfileUrl(profileUrl);
  if (!validation.ok) return NextResponse.json({ data: { deals: [] } });

  await ensurePhase1Database();
  const db = getD1();
  await syncDealLifecycle();

  const business = await db
    .prepare(`SELECT id FROM businesses WHERE nfcstore_business_url = ?1 AND nfcstore_status = 'VERIFIED' AND verification_status = 'VERIFIED' AND deleted_at IS NULL`)
    .bind(validation.normalizedUrl)
    .first<{ id: string }>();
  if (!business) return NextResponse.json({ data: { deals: [] } });

  const deals = await db
    .prepare(`
      SELECT d.id AS dealId, d.title, d.image_url AS imageUrl, d.original_price_uzs AS originalPriceUzs,
        d.discounted_price_uzs AS discountedPriceUzs, d.discount_percent AS discountPercent,
        d.remaining_quantity AS remainingQuantity, d.ends_at AS endsAt, d.slug
      FROM deals d
      WHERE d.business_id = ?1 AND d.deleted_at IS NULL AND d.status = 'ACTIVE'
        AND (d.remaining_quantity IS NULL OR d.remaining_quantity > 0)
        AND datetime(d.starts_at) <= datetime('now') AND datetime(d.ends_at) > datetime('now')
      ORDER BY datetime(d.ends_at) ASC
      LIMIT 20
    `)
    .bind(business.id)
    .all<ActiveDealForNfcStore & { slug: string }>();

  const data: ActiveDealForNfcStore[] = deals.results.map((deal) => ({
    dealId: deal.dealId,
    title: deal.title,
    imageUrl: deal.imageUrl,
    originalPriceUzs: deal.originalPriceUzs,
    discountedPriceUzs: deal.discountedPriceUzs,
    discountPercent: deal.discountPercent,
    remainingQuantity: deal.remainingQuantity,
    endsAt: deal.endsAt,
    bugunborUrl: `https://bugunbor.uz/deals/${deal.slug}`,
  }));

  return NextResponse.json({ data: { deals: data } });
}
