'use client';

import { BellRing } from 'lucide-react';
import { useState } from 'react';

import { apiRequest } from '@/lib/api-client';

type Settings = { notifyDeals: boolean; notifyReminders: boolean };

export function NotificationSettings({ initial, labels }: { initial: Settings; labels: { title: string; hint: string; deals: string; reminders: string; networkError: string } }) {
  const [settings, setSettings] = useState(initial);
  const [error, setError] = useState('');

  async function change(key: keyof Settings, value: boolean) {
    const previous = settings;
    setSettings({ ...settings, [key]: value });
    setError('');
    const result = await apiRequest('/api/v1/me', { [key]: value }, { method: 'PATCH', networkError: labels.networkError });
    if (!result.ok) {
      setSettings(previous);
      setError(result.message);
    }
  }

  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-white p-5">
      <legend className="sr-only">{labels.title}</legend>
      <p className="flex items-center gap-2 font-black text-navy"><BellRing className="size-5 text-[#229ED9]" aria-hidden /> {labels.title}</p>
      <p className="mt-1 text-xs text-slate-500">{labels.hint}</p>
      <div className="mt-4 space-y-3">
        {([['notifyDeals', labels.deals], ['notifyReminders', labels.reminders]] as const).map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold text-navy">
            <span>{label}</span>
            <input type="checkbox" checked={settings[key]} onChange={(event) => void change(key, event.target.checked)} className="peer sr-only" />
            <span aria-hidden className="relative h-6 w-11 shrink-0 rounded-full bg-slate-200 transition after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:bg-emerald-500 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40" />
          </label>
        ))}
      </div>
      {error ? <p role="alert" className="mt-3 text-xs font-semibold text-red-600">{error}</p> : null}
    </fieldset>
  );
}
