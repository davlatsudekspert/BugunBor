import type { Metadata } from 'next';

import { TelegramMiniApp } from '@/components/telegram-mini-app';

export const metadata: Metadata = { title: 'Telegram Mini App', robots: { index: false, follow: false } };

export default async function TelegramMiniAppPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  const safeReturn = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/discover';
  return <TelegramMiniApp returnTo={safeReturn} />;
}
