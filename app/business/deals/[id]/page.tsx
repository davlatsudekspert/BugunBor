import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { DealActions } from '@/components/business/deal-actions';
import { DealForm } from '@/components/business/deal-form';
import { WorkspaceShell } from '@/components/business/workspace-shell';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { dateToTashkentInput, parseDbTime } from '@/lib/time';
import { requireWorkspace } from '@/modules/businesses/current';
import { listBranches } from '@/modules/businesses/service';
import { categoryName, listCategories } from '@/modules/catalog/queries';
import { getBusinessDeal } from '@/modules/deals/service';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.biz.dealForm.editTitle, robots: { index: false, follow: false } };
}

export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ws = await requireWorkspace(`/business/deals/${id}`, 'deal.write');
  const { t, locale, db, membership } = ws;
  const deal = await getBusinessDeal(db, membership.businessId, id).catch(() => null);
  if (!deal) notFound();
  const [categories, branches] = await Promise.all([listCategories(db, { includeInactive: true }), listBranches(db, membership.businessId)]);
  const editable = deal.status === 'DRAFT' || deal.status === 'REJECTED';

  return (
    <WorkspaceShell ws={ws} active="deals">
      <h2 className="text-2xl font-black tracking-[-.03em] text-navy">{t.biz.dealForm.editTitle}</h2>
      {deal.status === 'REJECTED' && deal.rejectionReason ? (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{fmt(t.biz.deals.rejectedReason, { reason: deal.rejectionReason })}</p>
      ) : null}
      {editable ? (
        <div className="mt-5">
          <DealForm
            businessId={membership.businessId}
            businessName={membership.name}
            dealId={deal.id}
            categories={categories.map((category) => ({ id: category.id, name: categoryName(category, locale), slug: category.slug }))}
            branches={branches.map((branch) => ({ id: branch.id, name: branch.name }))}
            initial={{
              title: deal.title,
              description: deal.description,
              terms: deal.terms,
              categoryId: deal.categoryId,
              visual: deal.visual ?? 'gift',
              originalPrice: String(deal.originalPrice ?? ''),
              price: String(deal.price),
              startsAt: dateToTashkentInput(parseDbTime(deal.startsAt)),
              endsAt: dateToTashkentInput(parseDbTime(deal.endsAt)),
              quantity: deal.total === null ? '20' : String(deal.total),
              unlimited: deal.total === null,
              perCustomerLimit: String(deal.perCustomerLimit),
              claimTtlMinutes: String(deal.claimTtlMinutes),
              branchIds: deal.branchIds,
            }}
            t={{ biz: t.biz, validation: t.validation, common: t.common, errors: t.errors, deal: t.deal }}
          />
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6">
          <p className="font-bold text-navy">{deal.title}</p>
          <p className="mt-2 text-sm text-slate-600">{t.biz.deals.activeLocked}</p>
          <div className="mt-4">
            <DealActions
              businessId={membership.businessId}
              dealId={deal.id}
              slug={deal.slug}
              status={deal.status}
              isSponsored={deal.isSponsored}
              labels={{ ...t.biz.deals.actions, confirmEnd: t.biz.deals.confirmEnd, confirmDelete: t.biz.deals.confirmDelete, topOn: t.billing.topOn, topOff: t.billing.topOff, networkError: t.common.networkError }}
            />
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}
