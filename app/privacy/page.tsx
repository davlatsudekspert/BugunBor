import type { Metadata } from 'next';

import { LegalPage } from '@/components/site/legal-page';
import { getI18n } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.legal.privacyTitle, alternates: { canonical: '/privacy' } };
}

export default async function PrivacyPage() {
  const { t } = await getI18n();
  return <LegalPage title={t.legal.privacyTitle} sections={t.legal.privacy} t={t} />;
}
