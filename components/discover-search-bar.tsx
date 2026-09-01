'use client';

import { Search } from 'lucide-react';

import { useRegionDistrict } from '@/hooks/use-region-district';

export function DiscoverSearchBar({ defaultQuery, defaultRegion, defaultDistrict }: { defaultQuery?: string; defaultRegion?: string; defaultDistrict?: string }) {
  const { region, setRegion, district, setDistrict, districts, regions } = useRegionDistrict(defaultRegion, defaultDistrict, true);

  return (
    <form action="/discover" className="mt-6 flex max-w-3xl flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:flex-row">
      <label className="flex h-12 flex-1 items-center gap-2 px-3">
        <Search className="size-5 text-slate-400" />
        <span className="sr-only">Qidiruv</span>
        <input defaultValue={defaultQuery} name="q" placeholder="Taom, xizmat yoki biznes…" className="min-w-0 flex-1 outline-none" />
      </label>
      <select name="region" value={region} onChange={(event) => setRegion(event.target.value)} className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none sm:w-40">
        {regions.map((entry) => <option key={entry.name} value={entry.name}>{entry.name}</option>)}
      </select>
      <select name="city" value={district} onChange={(event) => setDistrict(event.target.value)} className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none sm:w-44">
        <option value="">Butun viloyat</option>
        {districts.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
      <button type="submit" className="h-12 rounded-xl bg-primary px-6 text-sm font-bold text-white">Topish</button>
    </form>
  );
}
