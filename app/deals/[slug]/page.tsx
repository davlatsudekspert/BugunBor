import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, BadgeCheck, CalendarClock, Clock3, Eye, MapPin, Navigation, Phone, ShieldCheck, Ticket, Timer, TriangleAlert } from 'lucide-react';

import { BusinessAvatar } from '@/components/deals/business-avatar';
import { ClaimPanel } from '@/components/deals/claim-panel';
import { Countdown } from '@/components/deals/countdown';
import { DealCard } from '@/components/deals/deal-card';
import { DealVisual } from '@/components/deals/deal-visual';
import { FavoriteButton } from '@/components/deals/favorite-button';
import { FollowButton } from '@/components/deals/follow-button';
import { RatingStars, ratingText } from '@/components/deals/rating-stars';
import { ShareButton } from '@/components/deals/share-button';
import { OpenBadge } from '@/components/deals/open-badge';
import { DealViewTracker } from '@/components/deals/view-tracker';
import { getDb } from '@/db/client';
import { cityName } from '@/lib/cities';
import { getConfig } from '@/lib/env';
import { formatDurationMinutes, formatMoment, formatNumber, formatPhone, formatSum, formatWorkingHours } from '@/lib/format';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { minutesUntilOpen, parseHours } from '@/lib/hours';
import { directionsUrl } from '@/lib/maps';
import { parseDbTime, toDbTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { getCurrentUser, isModerator } from '@/modules/auth/current';
import { getDealBySlug, getFavoriteIds, getPublicBusiness } from '@/modules/catalog/queries';
import { followState } from '@/modules/engagement/follows';

async function loadDeal(slug: string) {
  return getDealBySlug(await getDb(), slug, { demo: getConfig().demoMode });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [{ t }, deal] = await Promise.all([getI18n(), loadDeal(slug)]);
  if (!deal || !deal.isPublic) return { title: t.deal.notFoundTitle, robots: { index: false, follow: false } };
  const title = fmt(t.deal.shareText, { title: deal.title, percent: deal.discountPercent });
  const description = `${deal.business.name}: ${deal.description}`.slice(0, 200);
  const indexable = deal.effective === 'LIVE' || deal.effective === 'SCHEDULED';
  return {
    title,
    description,
    alternates: { canonical: `/deals/${deal.slug}` },
    robots: { index: indexable, follow: true },
    openGraph: { title, description },
    twitter: { title, description },
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
  const [favorites, usage, business, follow] = await Promise.all([
    user ? getFavoriteIds(db, user.id) : Promise.resolve(new Set<string>()),
    user
      ? db.prepare(`SELECT SUM(CASE WHEN status = 'CLAIMED' AND expires_at > ?3 THEN 1 ELSE 0 END) AS active,
            SUM(CASE WHEN status = 'COMPLETED' OR (status = 'CLAIMED' AND expires_at > ?3) THEN 1 ELSE 0 END) AS used
          FROM redemptions WHERE deal_id = ?1 AND user_id = ?2`).bind(deal.id, user.id, toDbTime(now)).first<{ active: number | null; used: number | null }>()
      : Promise.resolve(null),
    deal.isPublic ? getPublicBusiness(db, deal.business.slug, { demo: getConfig().demoMode }) : Promise.resolve(null),
    followState(db, deal.business.id, user?.id ?? null),
  ]);

  const claimable = deal.isPublic && deal.effective === 'LIVE' && deal.business.onAir;
  const firstBranch = deal.branches[0];
  const moreDeals = business?.deals.filter((item) => item.id !== deal.id).slice(0, 3) ?? [];
  const statusTone = deal.effective === 'LIVE' ? 'bg-emerald-50 text-emerald-700' : deal.effective === 'SCHEDULED' ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600';

  return (
    <main className="bg-cream pb-16">
      {deal.isPublic ? <DealViewTracker dealId={deal.id} /> : null}
      {preview ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-800">
          {t.deal.status[deal.effective]} · {t.deal.unavailable}
        </div>
      ) : null}
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <a href="/discover" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-primary"><ArrowLeft className="size-4" aria-hidden /> {t.deal.backToDeals}</a>
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1.15fr_.85fr]">
        <section className="min-w-0">
          <DealVisual visual={deal.visual} categorySlug={deal.category.slug} photo={deal.photo} priority className="min-h-64 rounded-[28px] p-5 shadow-[0_20px_60px_rgba(245,89,55,.18)] sm:min-h-80" emojiClassName="-bottom-6 right-6 text-[9rem] sm:text-[11rem]">
            <span className="relative inline-flex h-10 items-center rounded-full bg-white px-4 text-lg font-black text-navy shadow-sm">-{deal.discountPercent}%</span>
            <span className={cn('relative ml-2 inline-flex h-8 items-center rounded-full px-3 text-xs font-bold', statusTone)}>{t.deal.status[deal.effective]}</span>
          </DealVisual>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            <div>
              <a href={`/businesses/${deal.business.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-primary">
                <BusinessAvatar name={deal.business.name} logo={deal.business.logo} className="size-8 rounded-full bg-white text-[11px] text-navy ring-1 ring-slate-200" />
                {deal.business.name}
                {deal.business.verificationStatus === 'VERIFIED' ? <BadgeCheck className="size-5 fill-emerald-500 text-white" aria-label={t.common.verified} /> : null}
              </a>
              {deal.business.rating ? (
                <a href={`/businesses/${deal.business.slug}#reviews`} className="ml-10 mt-0.5 flex items-center gap-1.5 text-xs font-bold text-navy">
                  <RatingStars value={deal.business.rating.basisPoints / 100} className="[&>svg]:size-3.5" />
                  {ratingText(deal.business.rating.basisPoints)} <span className="font-semibold text-slate-500">· {fmt(t.business.ratingCount, { count: deal.business.rating.count })}</span>
                </a>
              ) : null}
            </div>
            {deal.isPublic ? (
              <FollowButton businessId={deal.business.id} initial={follow} loggedIn={Boolean(user)} compact labels={{ follow: t.business.follow, following: t.business.following, followers: t.business.followers, hint: t.business.followHint }} />
            ) : null}
          </div>
          <h1 className="mt-2 text-4xl font-black tracking-[-.05em] text-navy sm:text-5xl">{deal.title}</h1>
          <p className="mt-5 max-w-2xl whitespace-pre-line text-lg leading-8 text-slate-600">{deal.description}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {deal.branches.map((branch) => {
              const hours = formatWorkingHours(branch.hoursJson, t);
              return (
                <div key={branch.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-navy"><MapPin className="size-4 text-primary" aria-hidden /> {branch.name}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{branch.address}, {cityName(branch.city, locale)}</p>
                  {hours ? <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><CalendarClock className="size-4" aria-hidden /> {hours}</p> : null}
                  <OpenBadge hoursJson={branch.hoursJson} t={t} now={now} className="mt-1.5" />
                  <a href={directionsUrl(branch)} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1.5 text-sm font-bold text-primary"><Navigation className="size-4" aria-hidden /> {t.common.directions}</a>
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
            <p className="mt-4 flex items-center gap-2 text-sm text-emerald-700"><ShieldCheck className="size-4" aria-hidden /> {t.deal.verifiedNote}</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {deal.business.phone ? (
              <a className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-navy transition hover:border-primary/40" href={`tel:${deal.business.phone}`}>
                <Phone className="size-4" aria-hidden /> {formatPhone(deal.business.phone)}
              </a>
            ) : null}
            {firstBranch ? (
              <a className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-navy transition hover:border-primary/40" href={directionsUrl(firstBranch)} target="_blank" rel="noreferrer">
                <Navigation className="size-4" aria-hidden /> {t.common.directions}
              </a>
            ) : null}
            <ShareButton url={`/deals/${deal.slug}`} text={fmt(t.deal.shareText, { title: deal.title, percent: deal.discountPercent })} labels={{ share: t.common.share, copied: t.common.copied }} />
            <FavoriteButton dealId={deal.id} initial={favorites.has(deal.id)} loggedIn={Boolean(user)} labels={{ save: fmt(t.deal.saveAria, { title: deal.title }), unsave: fmt(t.deal.unsaveAria, { title: deal.title }) }} withText={{ save: t.deal.save, saved: t.deal.saved }} />
          </div>
          <a href={`/contact?subject=${encodeURIComponent(fmt(t.deal.reportSubject, { title: deal.title }))}`} className="mt-7 inline-flex items-center gap-2 text-sm text-slate-500 underline-offset-4 hover:underline">
            <TriangleAlert className="size-4" aria-hidden /> {t.deal.report}
          </a>
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

            <div className="mt-5">
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
            </div>
            {isMember || isModerator(user) ? (
              <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400"><Eye className="size-3.5" aria-hidden /> {t.biz.deals.views}: {deal.viewCount}</p>
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
