import { Bike, Coffee, Dumbbell, ShoppingBag, Sparkles, Tag, Ticket, Utensils, Wrench, type LucideIcon } from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  utensils: Utensils,
  coffee: Coffee,
  'shopping-bag': ShoppingBag,
  sparkles: Sparkles,
  dumbbell: Dumbbell,
  ticket: Ticket,
  wrench: Wrench,
  bike: Bike,
};

export const CATEGORY_ICON_KEYS = Object.keys(icons);

const colors: Record<string, string> = {
  taomlar: 'bg-orange-50 text-orange-700',
  kofe: 'bg-amber-50 text-amber-700',
  xaridlar: 'bg-sky-50 text-sky-700',
  gozallik: 'bg-pink-50 text-pink-700',
  sport: 'bg-teal-50 text-teal-700',
  kongilochar: 'bg-violet-50 text-violet-700',
  xizmatlar: 'bg-slate-100 text-slate-700',
  yetkazish: 'bg-emerald-50 text-emerald-700',
};

export function categoryColor(slug: string) {
  return colors[slug] ?? 'bg-orange-50 text-orange-700';
}

export function CategoryIcon({ icon, className }: { icon: string | null; className?: string }) {
  const Icon = (icon && icons[icon]) || Tag;
  return <Icon className={className} aria-hidden />;
}
