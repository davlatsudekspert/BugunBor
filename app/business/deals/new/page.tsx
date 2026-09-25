import type { Metadata } from 'next';

import { DealForm } from '@/components/business/deal-form';
import { WorkspaceShell } from '@/components/business/workspace-shell';
import { getI18n } from '@/lib/i18n/server';
import { dateToTashkentInput } from '@/lib/time';
import { dealVisual } from '@/lib/visuals';
import { requireWorkspace } from '@/modules/businesses/current';
import { listBranches } from '@/modules/businesses/service';
import { categoryName, listCategories } from '@/modules/catalog/queries';
import { DEAL_RULES } from '@/modules/deals/status';
import { defaultDealWindow } from '@/modules/deals/service';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.biz.dealForm.newTitle, robots: { index: false, follow: false } };
}

export default async function NewDealPage() {
  const ws = await requireWorkspace('/business/deals/new', 'deal.write');
  const { t, locale, db, membership } = ws;
  const [categories, branches, business] = await Promise.all([
    listCategories(db),
    listBranches(db, membership.businessId),
    db.prepare(`SELECT c.id AS categoryId, c.slug AS categorySlug FROM businesses b LEFT JOIN categories c ON c.id = b.category_id WHERE b.id = ?1`).bind(membership.businessId).first<{ categoryId: string | null; categorySlug: string | null }>(),
  ]);
  const window = defaultDealWindow();
  const categoryId = business?.categoryId ?? categories[0]?.id ?? '';
  return (
    <WorkspaceShell ws={ws} active="deals">
      <h2 className="mb-5 text-2xl font-black tracking-[-.03em] text-navy">{t.biz.dealForm.newTitle}</h2>
      <DealForm
        businessId={membership.businessId}
        businessName={membership.name}
        categories={categories.map((category) => ({ id: category.id, name: categoryName(category, locale), slug: category.slug }))}
        branches={branches.map((branch) => ({ id: branch.id, name: branch.name }))}
        initial={{
          title: '',
          description: '',
          terms: '',
          categoryId,
          visual: dealVisual(null, business?.categorySlug).key,
          originalPrice: '',
          price: '',
          startsAt: dateToTashkentInput(window.start),
          endsAt: dateToTashkentInput(window.end),
          quantity: '20',
          unlimited: false,
          perCustomerLimit: '1',
          claimTtlMinutes: String(DEAL_RULES.defaultClaimTtl),
          branchIds: branches.map((branch) => branch.id),
        }}
        t={{ biz: t.biz, validation: t.validation, common: t.common, errors: t.errors, deal: t.deal }}
      />
    </WorkspaceShell>
  );
}
