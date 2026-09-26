'use client';

import { Heart, House, Search, TicketCheck, UserRound } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

type Labels = { mobile: string; home: string; search: string; saved: string; codes: string; profile: string };

const items = [
  { href: '/', key: 'home', icon: House, match: (path: string) => path === '/' },
  { href: '/discover', key: 'search', icon: Search, match: (path: string) => path.startsWith('/discover') || path.startsWith('/categories') || path.startsWith('/deals') || path.startsWith('/businesses') },
  { href: '/account/saved', key: 'saved', icon: Heart, match: (path: string) => path.startsWith('/account/saved') },
  { href: '/account/codes', key: 'codes', icon: TicketCheck, match: (path: string) => path.startsWith('/account/codes') },
  { href: '/account', key: 'profile', icon: UserRound, match: (path: string) => path === '/account' || path.startsWith('/login') },
] as const;

export function MobileTabBar({ labels }: { labels: Labels }) {
  const pathname = usePathname();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pt-1.5 shadow-[0_-8px_30px_rgba(18,43,61,.08)] backdrop-blur md:hidden print:hidden" aria-label={labels.mobile}>
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ href, key, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <a key={key} href={href} aria-current={active ? 'page' : undefined} className={cn('flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10.5px] font-bold transition', active ? 'text-primary' : 'text-slate-500 hover:text-navy')}>
              <Icon className={cn('size-5', active && 'fill-primary/15')} aria-hidden />
              {labels[key]}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
