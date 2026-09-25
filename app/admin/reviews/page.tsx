import type { Metadata } from 'next';

import { ActionButton } from '@/components/admin/admin-controls';
import { AdminShell } from '@/components/admin/admin-shell';
import { RatingStars } from '@/components/deals/rating-stars';
import { getDb } from '@/db/client';
import { formatMoment } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import { parseDbTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { requireModerator } from '@/modules/auth/current';
import { listAdminReviews } from '@/modules/engagement/reviews';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.reviews.title, robots: { index: false, follow: false } };
}

export default async function AdminReviewsPage() {
  const user = await requireModerator('/admin/reviews');
  const [{ t, locale }, db] = await Promise.all([getI18n(), getDb()]);
  const reviews = await listAdminReviews(db);
  const r = t.admin.reviews;
  return (
    <AdminShell t={t} role={user.role} active="reviews">
      {reviews.length ? (
        <div className="space-y-3">
          {reviews.map((review) => (
            <article key={review.id} className={cn('rounded-2xl border bg-white p-5', review.status === 'HIDDEN' ? 'border-slate-200 opacity-70' : 'border-slate-200')}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <a href={`/businesses/${review.businessSlug}#reviews`} className="font-black text-navy hover:text-primary">{review.businessName}</a>
                  <p className="text-xs text-slate-500">{review.dealTitle} · {review.author ?? '—'} · {formatMoment(parseDbTime(review.createdAt), t, locale)}</p>
                </div>
                <RatingStars value={review.rating} />
              </div>
              {review.comment ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{review.comment}</p> : null}
              {review.status === 'HIDDEN' ? <p className="mt-2 text-xs font-bold text-red-600">{r.hidden}{review.hiddenReason ? ` · ${review.hiddenReason}` : ''}</p> : null}
              <div className="mt-3">
                {review.status === 'HIDDEN' ? (
                  <ActionButton payload={{ type: 'review.visibility', reviewId: review.id, hidden: false, reason: '' }} label={r.show} networkError={t.common.networkError} />
                ) : (
                  <ActionButton payload={{ type: 'review.visibility', reviewId: review.id, hidden: true }} label={r.hide} reasonPrompt={r.hideReason} tone="danger" networkError={t.common.networkError} />
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">{r.empty}</p>
      )}
    </AdminShell>
  );
}
