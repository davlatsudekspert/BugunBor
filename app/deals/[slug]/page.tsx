import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, BadgeCheck, CalendarClock, Clock3, Eye, Info, Layers, MapPin, Navigation, Phone, ShieldCheck, Ticket, Timer } from 'lucide-react';

import { BusinessAvatar } from '@/components/deals/business-avatar';
import { ClaimPanel } from '@/components/deals/claim-panel';
import { ComplaintButton } from '@/components/deals/complaint-button';
import { reportProps } from '@/components/deals/complaint-labels';
import { Countdown } from '@/components/deals/countdown';
import { DealCard } from '@/components/deals/deal-card';
import { DealVisual } from '@/components/deals/deal-visual';
import { FavoriteButton } from '@/components/deals/favorite-button';
import { FollowButton } from '@/components/deals/follow-button';
import { RatingStars, ratingText } from '@/components/deals/rating-stars';
import { ShareButton } from '@/components/deals/share-button';
import { OpenBadge } from '@/components/deals/open-badge';
import { DealViewTracker } from '@/components/deals/view-tracker';
import { JsonLd } from '@/components/site/json-ld';
import { getDb } from '@/db/client';
import { cityName } from '@/lib/cities';
import { getConfig } from '@/lib/env';
import { formatDurationMinutes, formatMoment, formatNumber, formatPhone, formatSum, formatWorkingHours } from '@/lib/format';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { minutesUntilOpen, parseHours } from '@/lib/hours';
import { directionsUrl } from '@/lib/maps';
import { formatClock, formatNumericDate, parseDbTime, toDbTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { getCurrentUser, isModerator } from '@/modules/auth/current';
import { getDealBySlug, getFavoriteIds, getPublicBusiness } from '@/modules/catalog/queries';
import { demoEnabled } from '@/modules/demo';
import { followState } from '@/modules/engagement/follows';
import { NO_SHOW_RULES, noShowState } from '@/modules/redemptions/no-shows';

/** Fewer views than this are not worth showing on the deal page. */
const MIN_VIEWS_SHOWN = 10;

async function loadDeal(slug: string) {
  const [db, { locale }] = await Promise.all([getDb(), getI18n()]);
  return getDealBySlug(db, slug, { demo: await demoEnabled(db), locale });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [{ t }, deal] = await Promise.all([getI18n(), loadDeal(slug)]);
  if (!deal || !deal.isPublic) return { title: t.deal.notFoundTitle, robots: { index: false, follow: false } };
  const title = fmt(t.deal.shareText, { title: deal.title, percent: deal.discountPercent });
  const description = `${deal.business.name}: ${deal.description}`.slice(0, 200);
  const indexable = (deal.effective === 'LIVE' || deal.effective === 'SCHEDULED') && !deal.isDemo && !deal.business.isDemo;
  return {
    title,
    description,
    alternates: { canonical: `/deals/${deal.slug}` },
    robots: { index: indexable, follow: true },
    // Telegram and other link previews show the deal's own photo when it has one.
    openGraph: { title, description, ...(deal.photo ? { images: [{ url: deal.photo, width: 1280, height: 960, alt: deal.title }] } : {}) },
    twitter: { title, description, ...(deal.photo ? { card: 'summary_large_image', images: [deal.photo] } : {}) },
  };
}

export default async function DealPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ t, locale }, deal, user] = await Promise.all([getI18n(), loadDeal(slug), getCurrentUser()]);
  if (!deal) notFound();

  const db = await getDb();
  const isMember = user
    ? Boolean(await db.prepare(`SELECT 1 FROM business_members WHERE business_id = ?1 AND user_id = ?2 AND revoked_at IS NULL`).bind(deal.business.id, user.id).first())
    : false;
  const preview = !deal.isPublic;
  if (preview && !isMember && !isModerator(user)) notFound();

  const now = new Date();
  const [favorites, usage, business, follow, noShows] = await Promise.all([
    user ? getFavoriteIds(db, user.id) : Promise.resolve(new Set<string>()),
    user
      ? db.prepare(`SELECT SUM(CASE WHEN status = 'CLAIMED' AND expires_at > ?3 THEN 1 ELSE 0 END) AS active,
            SUM(CASE WHEN status = 'COMPLETED' OR (status = 'CLAIMED' AND expires_at > ?3) THEN 1 ELSE 0 END) AS used
          FROM redemptions WHERE deal_id = ?1 AND user_id = ?2`).bind(deal.id, user.id, toDbTime(now)).first<{ active: number | null; used: number | null }>()
      : Promise.resolve(null),
    deal.isPublic ? demoEnabled(db).then((demo) => getPublicBusiness(db, deal.business.slug, { demo, locale })) : Promise.resolve(null),
    followState(db, deal.business.id, user?.id ?? null),
    user ? noShowState(db, user.id, now) : Promise.resolve(null),
  ]);
  // Booked and never came: warned after two, booking paused after three (a day).
  const pausedUntil = noShows?.pausedUntil ? parseDbTime(noShows.pausedUntil) : null;
  const notice = pausedUntil
    ? { text: fmt(t.errors.NO_SHOW_PAUSE, { time: `${formatNumericDate(pausedUntil).slice(0, 5)} ${formatClock(pausedUntil)}` }), blocking: true }
    : noShows && noShows.count >= NO_SHOW_RULES.limit - 1
      ? { text: fmt(t.claim.noShowWarning, { count: noShows.count }), blocking: false }
      : null;

  // Samples show how the site works; outside development nobody can claim them.
  // They have no street address, directions, timer or stock count either: the
  // place does not exist and the urgency would be made up.
  const sample = deal.isDemo || deal.business.isDemo;
  const demoOnly = sample && !getConfig().isDevelopment;
  const claimable = deal.isPublic && deal.effective === 'LIVE' && deal.business.onAir && !demoOnly;
  const firstBranch = deal.branches[0];
  const moreDeals = business?.deals.filter((item) => item.id !== deal.id).slice(0, 3) ?? [];
  const statusTone = deal.effective === 'LIVE' ? 'bg-emerald-50 text-emerald-700' : deal.effective === 'SCHEDULED' ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600';

  const origin = getConfig().appUrl ?? 'https://bugunbor.uz';
  const structured = !deal.isPublic || sample
    ? null
    : {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: deal.title,
        description: deal.description,
        ...(deal.photo ? { image: `${origin}${deal.photo}` } : {}),
        brand: { '@type': 'Brand', name: deal.business.name },
        offers: {
          '@type': 'Offer',
          url: `${origin}/deals/${deal.slug}`,
          price: deal.price,
          priceCurrency: 'UZS',
          availability: `https://schema.org/${{ LIVE: 'InStock', SOLD_OUT: 'SoldOut', SCHEDULED: 'PreOrder' }[deal.effective as string] ?? 'Discontinued'}`,
          validFrom: parseDbTime(deal.startsAt).toISOString(),
          validThrough: parseDbTime(deal.endsAt).toISOString(),
          // The last day in Tashkent (UTC+5): a deal ending at 02:00 there ends on that day, not the day before.
          priceValidUntil: new Date(parseDbTime(deal.endsAt).getTime() + 5 * 3_600_000).toISOString().slice(0, 10),
          seller: { '@type': 'LocalBusiness', name: deal.business.name },
        },
        ...(deal.business.rating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: (deal.business.rating.basisPoints / 100).toFixed(1), reviewCount: deal.business.rating.count } } : {}),
      };

  return (
    <main className="bg-cream pb-16">
      {structured ? <JsonLd data={structured} /> : null}
      {deal.isPublic ? <DealViewTracker dealId={deal.id} /> : null}
      {preview ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-800">
          {t.deal.status[deal.effective]} · {t.deal.unavailable}
        </div>
      ) : null}
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <a href="/discover" className="-my-2 inline-flex items-center gap-2 py-2 text-sm font-bold text-slate-600 hover:text-primary"><ArrowLeft className="size-4" aria-hidden /> {t.deal.backToDeals}</a>
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1.15fr_.85fr]">
        <section className="min-w-0">
          <DealVisual visual={deal.visual} categorySlug={deal.category.slug} photo={deal.photo} priority sizes="(min-width: 1024px) 50vw, 100vw" className="min-h-64 rounded-[28px] p-5 shadow-[0_20px_60px_rgba(245,89,55,.18)] sm:min-h-80" emojiClassName="-bottom-6 right-6 text-[9rem] sm:text-[11rem]">
            <span className="relative inline-flex h-10 items-center rounded-full bg-white px-4 text-lg font-black text-navy shadow-sm">-{deal.discountPercent}%</span>
            {sample ? null : <span className={cn('relative ml-2 inline-flex h-8 items-center rounded-full px-3 text-xs font-bold', statusTone)}>{t.deal.status[deal.effective]}</span>}
          </DealVisual>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            <div>
              <a href={`/businesses/${deal.business.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-primary">
                <BusinessAvatar name={deal.business.name} logo={deal.business.logo} className="size-8 rounded-full bg-white text-[11px] text-navy ring-1 ring-slate-200" />
                {deal.business.name}
                {sample ? null : deal.business.badge ? (
                  <BadgeCheck className="size-5 fill-emerald-500 text-white" aria-label={t.business.verified} />
                ) : deal.business.isNew ? (
                  <span title={t.business.newHint} className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-black text-sky-700">{t.business.newBadge}</span>
                ) : null}
              </a>
              {deal.business.rating ? (
                <a href={`/businesses/${deal.business.slug}#reviews`} className="ml-10 mt-0.5 flex items-center gap-1.5 text-xs font-bold text-navy">
                  <RatingStars value={deal.business.rating.basisPoints / 100} className="[&>svg]:size-3.5" decorative />
                  {ratingText(deal.business.rating.basisPoints)} <span className="font-semibold text-slate-500">· {fmt(t.business.ratingCount, { count: deal.business.rating.count })}</span>
                </a>
              ) : null}
            </div>
            {/* Nobody to follow or report: a sample business does not exist (the app hides both too). */}
            {deal.isPublic && !sample ? (
              <FollowButton businessId={deal.business.id} initial={follow} loggedIn={Boolean(user)} compact labels={{ follow: t.business.follow, following: t.business.following, followers: t.business.followers, hint: t.business.followHint, error: t.common.networkError }} />
            ) : null}
          </div>
          {sample ? <span className="mt-4 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">{t.common.sample}</span> : null}
          <h1 className="mt-2 text-4xl font-black tracking-[-.05em] text-navy sm:text-5xl">{deal.title}</h1>
          <p className="mt-5 max-w-2xl whitespace-pre-line text-lg leading-8 text-slate-600">{deal.description}</p>
          {deal.set ? (
            <div className="mt-6 max-w-2xl rounded-2xl border border-primary/25 bg-white p-5">
              <h2 className="flex flex-wrap items-center gap-x-2 font-black text-navy">
                <Layers className="size-5 text-primary" aria-hidden /> {t.deal.set.contents}
                {deal.set.persons ? <span className="text-sm font-bold text-slate-500">· {fmt(t.deal.set.persons, { count: deal.set.persons })}</span> : null}
              </h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {deal.set.items.map((item, index) => (
                  <li key={index} className="flex items-center justify-between gap-4 py-2.5 text-slate-700">
                    <span>{item.name}</span>
                    <span className="shrink-0 font-bold text-navy tabular">× {item.qty}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {deal.branches.map((branch) => {
              const hours = formatWorkingHours(branch.hoursJson, t);
              return (
                <div key={branch.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-navy"><MapPin className="size-4 text-primary" aria-hidden /> {branch.name}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{sample ? cityName(branch.city, locale) : `${branch.address}, ${cityName(branch.city, locale)}`}</p>
                  {hours ? <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><CalendarClock className="size-4" aria-hidden /> {hours}</p> : null}
                  <OpenBadge hoursJson={branch.hoursJson} t={t} now={now} className="mt-1.5" />
                  {sample ? null : <a href={directionsUrl(branch)} target="_blank" rel="noreferrer" className="-mb-2 mt-1 flex w-fit items-center gap-1.5 py-2 text-sm font-bold text-primary"><Navigation className="size-4" aria-hidden /> {t.common.directions}</a>}
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-black text-navy">{t.deal.terms}</h2>
            <p className="mt-2 whitespace-pre-line leading-7 text-slate-600">{deal.terms}</p>
            <ul className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <li className="flex items-center gap-2"><Ticket className="size-4 text-primary" aria-hidden /> {fmt(t.deal.perCustomer, { count: deal.perCustomerLimit })}</li>
              <li className="flex items-center gap-2"><Timer className="size-4 text-primary" aria-hidden /> {fmt(t.deal.codeValidity, { duration: formatDurationMinutes(deal.claimTtlMinutes, t) })}</li>
            </ul>
            {/* «Checked» only as far as it is true: the business by a moderator, the deal against the rules. */}
            {sample ? null : <p className="mt-4 flex items-center gap-2 text-sm text-emerald-700"><ShieldCheck className="size-4 shrink-0" aria-hidden /> {deal.business.badge ? t.deal.verifiedNote : t.deal.checkedNote}</p>}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {deal.business.phone ? (
              <a className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-navy transition hover:border-primary/40" href={`tel:${deal.business.phone}`}>
                <Phone className="size-4" aria-hidden /> {formatPhone(deal.business.phone)}
              </a>
            ) : null}
            {firstBranch && !sample ? (
              <a className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-navy transition hover:border-primary/40" href={directionsUrl(firstBranch)} target="_blank" rel="noreferrer">
                <Navigation className="size-4" aria-hidden /> {t.common.directions}
              </a>
            ) : null}
            <ShareButton url={`/deals/${deal.slug}`} text={fmt(t.deal.shareText, { title: deal.title, percent: deal.discountPercent })} labels={{ share: t.common.share, copied: t.common.copied }} />
            <FavoriteButton dealId={deal.id} initial={favorites.has(deal.id)} loggedIn={Boolean(user)} labels={{ save: fmt(t.deal.saveAria, { title: deal.title }), unsave: fmt(t.deal.unsaveAria, { title: deal.title }) }} withText={{ save: t.deal.save, saved: t.deal.saved }} />
          </div>
          {deal.isPublic && !sample ? (
            <ComplaintButton targetType="DEAL" targetId={deal.id} loggedIn={Boolean(user)} loginHref={`/login?returnTo=${encodeURIComponent(`/deals/${deal.slug}`)}`} className="mt-5" {...reportProps(t)} />
          ) : null}
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(20,40,55,.1)]">
            <div className="flex flex-wrap items-end gap-x-2">
              <strong className="text-4xl font-black text-primary">{formatNumber(deal.price)}</strong>
              <span className="pb-1 font-bold text-navy">{t.common.sum}</span>
            </div>
            {deal.originalPrice ? (
              <p className="mt-1 text-sm text-slate-400">
                <span className="line-through">{formatSum(deal.originalPrice, t)}</span>
                <span className="ml-2 font-bold text-emerald-700">{fmt(t.deal.youSave, { amount: formatSum(deal.originalPrice - deal.price, t) })}</span>
              </p>
            ) : null}

            {sample ? null : (
              <>
                <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-navy p-4 text-white">
                  <span className="flex items-center gap-2 text-sm font-bold"><Clock3 className="size-5 text-orange-300" aria-hidden /> {deal.effective === 'SCHEDULED' ? t.deal.startsIn : t.deal.endsIn}</span>
                  {deal.effective === 'LIVE' || deal.effective === 'SCHEDULED' ? (
                    <Countdown target={deal.effective === 'SCHEDULED' ? deal.startsAt : deal.endsAt} daysLabel={t.common.daysShort} className="tabular font-mono text-lg font-black" />
                  ) : (
                    <span className="text-sm font-bold">{t.deal.status[deal.effective]}</span>
                  )}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {t.deal.endsAt}: {formatMoment(parseDbTime(deal.endsAt), t, locale, now)}
                </p>
                <p className={cn('mt-3 text-sm font-semibold', deal.remaining !== null && deal.remaining <= 5 ? 'text-red-600' : 'text-amber-700')}>
                  {deal.remaining === null ? t.deal.unlimited : fmt(t.deal.left, { count: deal.remaining })}
                </p>
              </>
            )}

            <div className="mt-5">
              {demoOnly ? (
                // A sample business does not exist: explain instead of showing a dead button.
                <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  <p className="flex items-center gap-2 font-bold"><Info className="size-4 shrink-0" aria-hidden /> {t.claim.demoOnly}</p>
                  <p className="mt-1">{fmt(t.claim.demoHint, { button: t.claim.button })}</p>
                </div>
              ) : (
                <ClaimPanel
                  dealId={deal.id}
                  branches={deal.branches.map((branch) => {
                    // Warn when the code would expire before this branch even opens.
                    const hours = parseHours(branch.hoursJson);
                    const wait = hours ? minutesUntilOpen(hours, now) : 0;
                    const warning = hours && wait > 0 && wait >= deal.claimTtlMinutes
                      ? fmt(t.deal.closedWarning, { time: hours.open, duration: formatDurationMinutes(deal.claimTtlMinutes, t) })
                      : null;
                    return { id: branch.id, name: branch.name, address: branch.address, warning };
                  })}
                  loggedIn={Boolean(user)}
                  loginHref={`/login?returnTo=${encodeURIComponent(`/deals/${deal.slug}`)}`}
                  claimable={claimable}
                  hasActiveCode={Boolean(usage?.active)}
                  notice={notice}
                  limitReached={(usage?.used ?? 0) >= deal.perCustomerLimit}
                  labels={{
                    button: t.claim.button,
                    loginToClaim: t.claim.loginToClaim,
                    claiming: t.claim.claiming,
                    hint: fmt(t.claim.hint, { duration: formatDurationMinutes(deal.claimTtlMinutes, t) }),
                    successTitle: t.claim.successTitle,
                    yourCode: t.claim.yourCode,
                    validUntil: t.claim.validUntil,
                    showToCashier: t.claim.showToCashier,
                    goToCodes: t.claim.goToCodes,
                    alreadyHave: t.claim.alreadyHave,
                    limitReached: t.errors.LIMIT_REACHED,
                    viewCode: t.claim.viewCode,
                    chooseBranch: t.deal.chooseBranch,
                    unavailable: t.claim.unavailable,
                    networkError: t.common.networkError,
                    qrAria: t.codes.qrAria,
                  }}
                />
              )}
            </div>
            {/* Only to the business and moderators, and only once the number says something. */}
            {(isMember || isModerator(user)) && deal.viewCount >= MIN_VIEWS_SHOWN ? (
              <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400"><Eye className="size-3.5" aria-hidden /> {t.biz.deals.views}: {formatNumber(deal.viewCount)}</p>
            ) : null}
          </div>
        </aside>
      </div>

      {moreDeals.length ? (
        <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <h2 className="text-2xl font-black tracking-[-.03em] text-navy">{fmt(t.deal.moreFromBusiness, { business: deal.business.name })}</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {moreDeals.map((item) => (
              <DealCard key={item.id} deal={item} t={t} locale={locale} favorite={favorites.has(item.id)} loggedIn={Boolean(user)} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
