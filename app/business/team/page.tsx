import type { Metadata } from 'next';

import { TeamManager } from '@/components/business/team-manager';
import { WorkspaceShell } from '@/components/business/workspace-shell';
import { formatPhone } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import { requireWorkspace } from '@/modules/businesses/current';
import { listMembers } from '@/modules/businesses/service';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.biz.team.title, robots: { index: false, follow: false } };
}

export default async function TeamPage() {
  const ws = await requireWorkspace('/business/team', 'team.manage');
  const { t, db, membership, user } = ws;
  const members = await listMembers(db, membership.businessId);
  return (
    <WorkspaceShell ws={ws} active="team">
      <h2 className="mb-5 text-2xl font-black tracking-[-.03em] text-navy">{t.biz.team.title}</h2>
      <TeamManager
        businessId={membership.businessId}
        currentUserId={user.id}
        members={members.map((member) => ({ userId: member.userId, displayName: member.displayName, phone: formatPhone(member.phone), role: member.role }))}
        t={{ biz: t.biz, validation: t.validation, common: t.common, errors: t.errors }}
      />
    </WorkspaceShell>
  );
}
