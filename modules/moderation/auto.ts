import type { Dictionary } from '@/lib/i18n';
import { normalizeSearchText } from '@/lib/search';
import { toDbTime } from '@/lib/time';
import { staffAlertStatement } from '@/modules/notifications/service';
import { decideBusiness, decideDeal } from './service';

// Automatic moderation. Every submitted business and deal is checked at once:
// a clean one is approved on the spot (signed by the system moderator), and one
// with a warning sign stays in the queue with the reasons, and the moderators
// get a Telegram alert. The system never rejects anything — people do.

/** Signs automatic decisions (migration 0007). It has no phone or Telegram, so nobody can log in as it. */
export const SYSTEM_MODERATOR_ID = 'usr_system';
export const AUTO_REASON = 'Avtomatik tekshiruv';

export const AUTO_SETTING_KEYS = {
  businesses: 'auto_approve_businesses',
  deals: 'auto_approve_deals',
  reviews: 'auto_hide_reviews',
} as const;

export type AutoModerationSettings = Record<keyof typeof AUTO_SETTING_KEYS, boolean>;

export async function getAutoModerationSettings(db: D1Database): Promise<AutoModerationSettings> {
  const rows = await db
    .prepare(`SELECT key, value FROM app_settings WHERE key IN (?1, ?2, ?3)`)
    .bind(AUTO_SETTING_KEYS.businesses, AUTO_SETTING_KEYS.deals, AUTO_SETTING_KEYS.reviews)
    .all<{ key: string; value: string }>();
  const values = new Map(rows.results.map((row) => [row.key, row.value]));
  // Switched on unless an admin turned it off.
  return {
    businesses: values.get(AUTO_SETTING_KEYS.businesses) !== '0',
    deals: values.get(AUTO_SETTING_KEYS.deals) !== '0',
    reviews: values.get(AUTO_SETTING_KEYS.reviews) !== '0',
  };
}

export const AUTO_FLAGS = [
  'LINK', 'BANNED', 'RESTRICTED', 'CARD', 'PROFANITY', 'LOW_QUALITY', 'DUPLICATE_NAME', 'OWNER_HISTORY',
  'RESUBMITTED', 'LOCATION', 'DISCOUNT_HIGH', 'PRICE_LOW', 'PRICE_HIGH', 'BUSINESS_HISTORY',
] as const;
export type AutoFlag = (typeof AUTO_FLAGS)[number];

/** Flags the owner can clear by editing; the rest need a moderator. */
export const FIXABLE_FLAGS: ReadonlySet<AutoFlag> = new Set(['LINK', 'CARD', 'LOW_QUALITY', 'LOCATION', 'DISCOUNT_HIGH', 'PRICE_LOW', 'PRICE_HIGH']);

export const parseFlags = (note: string | null | undefined): AutoFlag[] =>
  (note ?? '').split(',').filter((flag): flag is AutoFlag => (AUTO_FLAGS as readonly string[]).includes(flag));

/** What the owner is told: only what they can fix themselves; the rest is for the moderator. */
export const ownerFlags = (note: string | null | undefined) => parseFlags(note).filter((flag) => FIXABLE_FLAGS.has(flag));

export const flagText = (flags: readonly AutoFlag[], t: Pick<Dictionary, 'moderation'>) => flags.map((flag) => t.moderation.flags[flag]).join('; ');

// Word lists run on normalizeSearchText output: lowercase Latin (Cyrillic is
// transliterated, so "казино" is "kazino"), apostrophes dropped, punctuation
// turned into single spaces. `stem` matches at the start of a word, `word`
// only the whole word; both are chosen so that ordinary shop, cafe, salon and
// sport texts in Uzbek and Russian never trip them (see auto.test.ts).
const stem = (...parts: string[]) => `(?:^| )(?:${parts.join('|')})`;
const word = (...parts: string[]) => `(?:^| )(?:${parts.join('|')})(?= |$)`;

const BANNED = new RegExp([
  // Drugs
  stem('narkot', 'giyohvand', 'marixuan', 'marihuan', 'kokain', 'gashish', 'mefedron', 'amfetamin', 'ekstazi'),
  word('geroin', 'geroina', 'geroinom', 'anasha', 'spays', 'lsd'),
  // Weapons
  stem('qurol', 'oruj', 'boepripas', 'vzrivchat', 'weapon', 'firearm'),
  word('miltiq'),
  // Sexual services
  stem('eskort', 'escort', 'porno', 'fohisha', 'prostitut', 'intim xizmat', 'intim uchrashuv', 'intim uslug', 'intim vstrech'),
  word('seks', 'sex', 'porn', 'xxx'),
  // Gambling
  stem('kazino', 'casino', 'bukmeker', 'bookmaker', 'qimor', 'totalizator', '1xbet', 'mostbet', 'melbet', 'parimatch', 'stavki na sport'),
  // Get-rich-quick schemes
  stem('moliyaviy piramid', 'finansovaya piramid', 'tez boyish', 'bistriy zarabotok', 'legkie dengi', 'lyogkie dengi'),
].join('|'));

// Alcohol, tobacco and vapes are legal to sell but their advertising is
// restricted, so such offers wait for a person.
const RESTRICTED = new RegExp([
  stem('aroq', 'alkogol(?!siz)', 'alcohol', 'konyak', 'cognac', 'whisk', 'vodk', 'spirtli ichimlik', 'spirtn', 'pivovar', 'pivn'),
  word('pivo', 'pivoxona', 'beer', 'vino', 'wine'),
  stem('sigaret', 'cigaret', 'tamaki', 'tabak', 'tabach', 'tobacco', 'vape', 'vayp', 'veyp', 'kalyan', 'hookah', 'nosvoy', 'nosvay', 'nasvay'),
].join('|'));

const PROFANITY = new RegExp([
  stem('xuy', 'pizd', 'blya', 'ebat', 'ebal', 'eban', 'ebuch', 'zaeb', 'yoban', 'mudak', 'gandon', 'pidor', 'pidar', 'shlyux', 'dolboyob', 'dolbayob', 'dalbayob', 'fuck', 'bitch'),
  stem('sik(?:ay|aman|dim|di|ib|ish|tir)', 'onangni'),
  word('suka', 'sukin', 'jalab', 'qotaq', 'shit', 'cunt'),
].join('|'));

const CARD_WORDS = new RegExp(stem('karta raqam', 'kartaga otkaz', 'kartaga pul', 'nomer kart', 'na kartu', 'perevod na kart'));
// 16 digits, optionally grouped by spaces or dashes: an Uzcard, Humo, Visa or Mastercard number.
const CARD_NUMBER = /(?<!\d)\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}(?!\d)/;
const LINK = /(?:https?:\/\/|www\.|(?:t|telegram)\.me\/|(?<![\p{L}\p{N}.-])[a-z0-9][a-z0-9-]*\.(?:uz|com|ru|net|org|me|io|info|biz|shop|store|site|online|xyz|link|app|pro|club)(?![\p{L}\p{N}]))/iu;
const REPEATED_LETTER = /(\p{L})\1{4,}/u;

/** Checks free text a business shows to customers. */
export function textFlags(text: string, options: { links?: boolean; profanity?: boolean } = {}): AutoFlag[] {
  const flags: AutoFlag[] = [];
  const words = normalizeSearchText(text);
  if (options.links !== false && LINK.test(text)) flags.push('LINK');
  if (BANNED.test(words)) flags.push('BANNED');
  if (RESTRICTED.test(words)) flags.push('RESTRICTED');
  if (CARD_NUMBER.test(text) || CARD_WORDS.test(words)) flags.push('CARD');
  if (options.profanity && PROFANITY.test(words)) flags.push('PROFANITY');
  return flags;
}

const wordCount = (text: string) => normalizeSearchText(text).split(' ').filter(Boolean).length;
const lowQuality = (name: string, description: string) =>
  !/\p{L}/u.test(name) || wordCount(description) < 3 || REPEATED_LETTER.test(`${name} ${description}`.toLowerCase());

// Uzbekistan's bounding box; a branch pinned outside it was placed by mistake (or on purpose).
const inUzbekistan = (lat: number, lon: number) => lat >= 37.1 && lat <= 45.6 && lon >= 55.9 && lon <= 73.2;

const DEAL_LIMITS = { maxDiscountPercent: 80, minPriceUzs: 1000, maxOriginalUzs: 50_000_000, historyDays: 30 } as const;

const unique = (flags: AutoFlag[]) => AUTO_FLAGS.filter((flag) => flags.includes(flag));

/** Tells the moderators, once per submission, that something waits for them and why. */
const reviewAlert = (db: D1Database, input: { target: 'Business' | 'Deal'; id: string; submittedAt: string; flags: AutoFlag[]; nowDb: string }) =>
  staffAlertStatement(db, { kind: 'REVIEW_NEEDED', key: `${input.id}:${input.submittedAt}`, payload: { target: input.target, id: input.id, flags: input.flags.join(',') }, nowDb: input.nowDb });

async function rejectedByPerson(db: D1Database, targetType: 'Business' | 'Deal', targetId: string) {
  const row = await db
    .prepare(`SELECT 1 AS found FROM moderation_actions WHERE target_type = ?1 AND target_id = ?2 AND action = 'REJECT' AND actor_user_id != ?3 LIMIT 1`)
    .bind(targetType, targetId, SYSTEM_MODERATOR_ID)
    .first<{ found: number }>();
  return Boolean(row);
}

/** Checks of what a business wrote about itself (no database needed). */
export function businessContentFlags(
  business: { name: string; description: string; telegram?: string | null; instagram?: string | null; website?: string | null },
  branches: ReadonlyArray<{ name: string; address: string }> = [],
): AutoFlag[] {
  const places = branches.map((branch) => `${branch.name}\n${branch.address}`).join('\n');
  const flags = textFlags(`${business.name}\n${business.description}\n${places}`);
  // The contact fields are meant to hold links, but not to a casino or a shop for weapons.
  flags.push(...textFlags([business.telegram, business.instagram, business.website].filter(Boolean).join('\n'), { links: false }));
  if (lowQuality(business.name, business.description)) flags.push('LOW_QUALITY');
  return unique(flags);
}

/** Checks of the deal itself: its texts and whether the prices make sense. */
export function dealContentFlags(deal: { title: string; description: string; terms: string; originalPrice: number | null; price: number; discountPercent: number }): AutoFlag[] {
  const flags = textFlags(`${deal.title}\n${deal.description}\n${deal.terms}`);
  if (lowQuality(deal.title, deal.description)) flags.push('LOW_QUALITY');
  if (deal.discountPercent > DEAL_LIMITS.maxDiscountPercent) flags.push('DISCOUNT_HIGH');
  if (deal.price < DEAL_LIMITS.minPriceUzs) flags.push('PRICE_LOW');
  if ((deal.originalPrice ?? 0) > DEAL_LIMITS.maxOriginalUzs) flags.push('PRICE_HIGH');
  return unique(flags);
}

type BusinessFacts = { id: string; name: string; description: string; city: string; status: string; telegram: string | null; instagram: string | null; website: string | null; submittedAt: string | null };

export async function businessFlags(db: D1Database, business: BusinessFacts): Promise<AutoFlag[]> {
  const [branches, sameCity, ownerHistory, resubmitted] = await Promise.all([
    db.prepare(`SELECT name, address, latitude_e6 AS lat, longitude_e6 AS lon FROM branches WHERE business_id = ?1 AND deleted_at IS NULL`)
      .bind(business.id)
      .all<{ name: string; address: string; lat: number; lon: number }>(),
    db.prepare(`SELECT name FROM businesses WHERE city = ?1 AND id != ?2 AND deleted_at IS NULL AND is_demo = 0 AND verification_status IN ('PENDING', 'VERIFIED')`)
      .bind(business.city, business.id)
      .all<{ name: string }>(),
    db.prepare(`SELECT 1 AS found FROM business_members owner
        JOIN business_members other ON other.user_id = owner.user_id AND other.role = 'OWNER' AND other.business_id != owner.business_id
        JOIN businesses b ON b.id = other.business_id
        WHERE owner.business_id = ?1 AND owner.role = 'OWNER' AND owner.revoked_at IS NULL AND b.deleted_at IS NULL
          AND (b.verification_status = 'REJECTED' OR b.suspended_at IS NOT NULL) LIMIT 1`)
      .bind(business.id)
      .first<{ found: number }>(),
    rejectedByPerson(db, 'Business', business.id),
  ]);
  const flags = businessContentFlags(business, branches.results);
  const name = normalizeSearchText(business.name);
  if (sameCity.results.some((row) => normalizeSearchText(row.name) === name)) flags.push('DUPLICATE_NAME');
  if (ownerHistory) flags.push('OWNER_HISTORY');
  if (resubmitted) flags.push('RESUBMITTED');
  if (branches.results.some((branch) => !inUzbekistan(branch.lat / 1e6, branch.lon / 1e6))) flags.push('LOCATION');
  return unique(flags);
}

type DealFacts = { id: string; businessId: string; title: string; description: string; terms: string; originalPrice: number | null; price: number; discountPercent: number };

export async function dealFlags(db: D1Database, deal: DealFacts, now = new Date()): Promise<AutoFlag[]> {
  const since = toDbTime(new Date(now.getTime() - DEAL_LIMITS.historyDays * 86_400_000));
  const [history, resubmitted] = await Promise.all([
    db.prepare(`SELECT 1 AS found FROM moderation_actions ma JOIN deals d ON d.id = ma.target_id
        WHERE ma.target_type = 'Deal' AND ma.action IN ('REJECT', 'ARCHIVE') AND ma.actor_user_id != ?3
          AND d.business_id = ?1 AND d.id != ?2 AND ma.created_at >= ?4 LIMIT 1`)
      .bind(deal.businessId, deal.id, SYSTEM_MODERATOR_ID, since)
      .first<{ found: number }>(),
    rejectedByPerson(db, 'Deal', deal.id),
  ]);
  const flags = dealContentFlags(deal);
  if (history) flags.push('BUSINESS_HISTORY');
  if (resubmitted) flags.push('RESUBMITTED');
  return unique(flags);
}

export type AutoResult = { status: string; flags: AutoFlag[] };

/**
 * Runs the checks on a business waiting for review and approves it when they
 * pass (which starts its free period). Never throws: whatever goes wrong, the
 * business simply stays in the moderators' queue.
 */
export async function autoModerateBusiness(db: D1Database, businessId: string, now = new Date()): Promise<AutoResult | null> {
  try {
    const business = await db
      .prepare(`SELECT id, name, description, city, verification_status AS status, telegram, instagram, website, submitted_at AS submittedAt
        FROM businesses WHERE id = ?1 AND deleted_at IS NULL`)
      .bind(businessId)
      .first<BusinessFacts>();
    if (!business || business.status !== 'PENDING') return null;
    const [flags, settings] = await Promise.all([businessFlags(db, business), getAutoModerationSettings(db)]);
    const nowDb = toDbTime(now);
    if (flags.length || !settings.businesses) {
      await db.batch([
        db.prepare(`UPDATE businesses SET auto_review_note = ?2 WHERE id = ?1`).bind(businessId, flags.join(',')),
        reviewAlert(db, { target: 'Business', id: businessId, submittedAt: business.submittedAt ?? nowDb, flags, nowDb }),
      ]);
      return { status: 'PENDING', flags };
    }
    await db.prepare(`UPDATE businesses SET auto_review_note = '' WHERE id = ?1`).bind(businessId).run();
    await decideBusiness(db, { actorId: SYSTEM_MODERATOR_ID, businessId, decision: 'APPROVE', reason: AUTO_REASON }, now);
    await autoModeratePendingDeals(db, businessId, now);
    return { status: 'VERIFIED', flags };
  } catch (error) {
    console.error('Automatic business check failed', businessId, error instanceof Error ? error.message : error);
    return null;
  }
}

/** Same for a deal; it can only go live once its business is verified. */
export async function autoModerateDeal(db: D1Database, dealId: string, now = new Date()): Promise<AutoResult | null> {
  try {
    const deal = await db
      .prepare(`SELECT d.id, d.business_id AS businessId, d.title, d.description, d.terms, d.original_price_uzs AS originalPrice,
          d.discounted_price_uzs AS price, d.discount_percent AS discountPercent, d.status, d.submitted_at AS submittedAt,
          b.verification_status AS businessStatus, b.suspended_at AS suspendedAt
        FROM deals d JOIN businesses b ON b.id = d.business_id WHERE d.id = ?1 AND d.deleted_at IS NULL`)
      .bind(dealId)
      .first<DealFacts & { status: string; submittedAt: string | null; businessStatus: string; suspendedAt: string | null }>();
    if (!deal || deal.status !== 'PENDING_REVIEW') return null;
    const [flags, settings] = await Promise.all([dealFlags(db, deal, now), getAutoModerationSettings(db)]);
    const nowDb = toDbTime(now);
    const businessReady = deal.businessStatus === 'VERIFIED' && !deal.suspendedAt;
    if (flags.length || !settings.deals || !businessReady) {
      await db.batch([
        db.prepare(`UPDATE deals SET auto_review_note = ?2 WHERE id = ?1`).bind(dealId, flags.join(',')),
        // A deal of a business that is still in review waits for the business; that one already raised the alert.
        ...(businessReady ? [reviewAlert(db, { target: 'Deal', id: dealId, submittedAt: deal.submittedAt ?? nowDb, flags, nowDb })] : []),
      ]);
      return { status: 'PENDING_REVIEW', flags };
    }
    await db.prepare(`UPDATE deals SET auto_review_note = '' WHERE id = ?1`).bind(dealId).run();
    await decideDeal(db, { actorId: SYSTEM_MODERATOR_ID, dealId, decision: 'APPROVE', reason: AUTO_REASON }, now);
    return { status: 'ACTIVE', flags };
  } catch (error) {
    console.error('Automatic deal check failed', dealId, error instanceof Error ? error.message : error);
    return null;
  }
}

/** Deals submitted while the business was in review get their turn once it is approved. */
export async function autoModeratePendingDeals(db: D1Database, businessId: string, now = new Date()) {
  const pending = await db
    .prepare(`SELECT id FROM deals WHERE business_id = ?1 AND status = 'PENDING_REVIEW' AND deleted_at IS NULL ORDER BY submitted_at LIMIT 50`)
    .bind(businessId)
    .all<{ id: string }>();
  for (const deal of pending.results) await autoModerateDeal(db, deal.id, now);
}

/** Customer reviews with obscene words, links or card numbers are hidden at once; a moderator can show them again. */
export function reviewFlags(comment: string | null): AutoFlag[] {
  if (!comment) return [];
  return textFlags(comment, { profanity: true }).filter((flag) => flag !== 'RESTRICTED');
}
