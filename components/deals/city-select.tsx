'use client';

import { CITIES } from '@/lib/cities';
import { cn } from '@/lib/utils';

/** City <select> that remembers the choice for a year so the home page follows it. */
export function CitySelect({ value, locale, label, className, name = 'city', autoSubmit = false }: {
  value: string;
  locale: 'uz' | 'ru';
  label: string;
  className?: string;
  name?: string;
  autoSubmit?: boolean;
}) {
  return (
    <select
      name={name}
      defaultValue={value}
      aria-label={label}
      className={cn('bg-transparent outline-none', className)}
      onChange={(event) => {
        document.cookie = `bb_city=${event.target.value}; Path=/; Max-Age=31536000; SameSite=Lax`;
        if (autoSubmit) event.target.form?.requestSubmit();
      }}
    >
      {CITIES.map((city) => (
        <option key={city.slug} value={city.slug}>{locale === 'ru' ? city.ru : city.uz}</option>
      ))}
    </select>
  );
}
