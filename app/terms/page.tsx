import type { Metadata } from 'next';

import { LegalPage } from '@/components/site/legal-page';
import { getI18n } from '@/lib/i18n/server';
import { localeAlternates } from '@/lib/locale-paths';

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  return { title: t.legal.termsTitle, description: t.legal.termsDescription, alternates: localeAlternates('/terms', locale) };
}

export default async function TermsPage() {
  const { t } = await getI18n();
  return <LegalPage title={t.legal.termsTitle} sections={t.legal.terms} t={t} />;
}
