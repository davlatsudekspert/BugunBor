import type { Metadata } from 'next';

import { BusinessForm } from '@/components/business/business-form';
import { WorkspaceShell } from '@/components/business/workspace-shell';
import { getI18n } from '@/lib/i18n/server';
import { categoryName, listCategories } from '@/modules/catalog/queries';
import { requireWorkspace } from '@/modules/businesses/current';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.biz.profile.title, robots: { index: false, follow: false } };
}

export default async function BusinessProfilePage() {
  const ws = await requireWorkspace('/business/profile', 'business.edit');
  const { t, locale, db, membership, user } = ws;
  const [categories, business, account] = await Promise.all([
    listCategories(db, { includeInactive: true }),
    db.prepare(`SELECT name, description, category_id AS categoryId, city, phone, telegram, instagram, website, logo_id AS logoId, cover_id AS coverId
        FROM businesses WHERE id = ?1`)
      .bind(membership.businessId)
      .first<{ name: string; description: string; categoryId: string; city: string; phone: string; telegram: string | null; instagram: string | null; website: string | null; logoId: string | null; coverId: string | null }>(),
    db.prepare(`SELECT telegram_username AS telegramUsername FROM users WHERE id = ?1`).bind(user.id).first<{ telegramUsername: string | null }>(),
  ]);
  return (
    <WorkspaceShell ws={ws} active="profile">
      <h2 className="text-2xl font-black tracking-[-.03em] text-navy">{t.biz.profile.title}</h2>
      <p className="mt-1 text-sm text-slate-500">{t.biz.profile.text}</p>
      <div className="mt-5 max-w-3xl">
        <BusinessForm
          mode="edit"
          businessId={membership.businessId}
          canResubmit={membership.verificationStatus === 'REJECTED'}
          pending={membership.verificationStatus === 'PENDING'}
          categories={categories.map((category) => ({ id: category.id, name: categoryName(category, locale), slug: category.slug, icon: category.icon }))}
          initial={business ?? {}}
          telegramUsername={account?.telegramUsername ?? null}
          locale={locale}
          t={{ businessForm: t.businessForm, validation: t.validation, onboarding: t.onboarding, common: t.common, biz: t.biz, errors: t.errors }}
        />
      </div>
    </WorkspaceShell>
  );
}
