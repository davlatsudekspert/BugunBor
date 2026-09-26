'use client';

import { Languages } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';

import { cn } from '@/lib/utils';

export function LanguageSwitch({ locale, label, className, full = false }: { locale: 'uz' | 'ru'; label: string; className?: string; full?: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const target = locale === 'uz' ? 'ru' : 'uz';
  const next = `${pathname}${search ? `?${search}` : ''}`;
  return (
    <a
      href={`/lang/${target}?next=${encodeURIComponent(next)}`}
      hrefLang={target === 'ru' ? 'ru' : 'uz'}
      lang={target === 'ru' ? 'ru' : 'uz'}
      className={cn('inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-navy', className)}
    >
      <Languages className="size-4" aria-hidden />
      {full ? label : target.toUpperCase()}
      {full ? null : <span className="sr-only">{label}</span>}
    </a>
  );
}
