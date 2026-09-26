import type { Metadata } from 'next';

import { BranchManager } from '@/components/business/branch-manager';
import { WorkspaceShell } from '@/components/business/workspace-shell';
import { CITIES } from '@/lib/cities';
import { parseHours } from '@/lib/hours';
import { getI18n } from '@/lib/i18n/server';
import { requireWorkspace } from '@/modules/businesses/current';
import { listBranches } from '@/modules/businesses/service';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.biz.branches.title, robots: { index: false, follow: false } };
}

export default async function BranchesPage() {
  const ws = await requireWorkspace('/business/branches', 'branch.write');
  const { t, locale, db, membership } = ws;
  const branches = await listBranches(db, membership.businessId);
  return (
    <WorkspaceShell ws={ws} active="branches">
      <h2 className="mb-5 text-2xl font-black tracking-[-.03em] text-navy">{t.biz.branches.title}</h2>
      <div className="max-w-3xl">
        <BranchManager
          businessId={membership.businessId}
          locale={locale}
          cityNames={Object.fromEntries(CITIES.map((city) => [city.slug, locale === 'ru' ? city.ru : city.uz]))}
          branches={branches.map((branch) => {
            const hours = parseHours(branch.hoursJson) ?? { open: '09:00', close: '21:00' };
            return { ...branch, open: hours.open, close: hours.close };
          })}
          t={{ biz: t.biz, validation: t.validation, common: t.common, errors: t.errors }}
        />
      </div>
    </WorkspaceShell>
  );
}
