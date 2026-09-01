'use client';

import { useState } from 'react';

import { findRegion, UZBEKISTAN_REGIONS } from '@/lib/uzbekistan-regions';

/**
 * Drives a viloyat -> tuman/shahar cascading select: picking a new region
 * resets the district. When `allowWholeRegion` is true (search filters), the
 * reset district is "" — an empty selection meaning "butun viloyat" (the
 * whole region) — rather than an arbitrary specific district, which matters
 * when a business must pick one real place (onboarding never allows this).
 * The same flag also lets the region itself start empty — "butun O‘zbekiston"
 * (the whole country) — instead of defaulting to Toshkent shahri; a search
 * should start unscoped, while onboarding still requires a real region.
 */
export function useRegionDistrict(defaultRegion?: string, defaultDistrict?: string, allowWholeRegion = false) {
  const [region, setRegionState] = useState(defaultRegion ?? (allowWholeRegion ? '' : UZBEKISTAN_REGIONS[0].name));
  const selectedRegion = region ? findRegion(region) : undefined;
  const [district, setDistrict] = useState(defaultDistrict ?? (allowWholeRegion ? '' : (selectedRegion ?? UZBEKISTAN_REGIONS[0]).districts[0]));

  function setRegion(nextRegionName: string) {
    setRegionState(nextRegionName);
    const nextRegion = nextRegionName ? findRegion(nextRegionName) : undefined;
    setDistrict(allowWholeRegion ? '' : (nextRegion ?? UZBEKISTAN_REGIONS[0]).districts[0]);
  }

  return { region, setRegion, district, setDistrict, districts: selectedRegion?.districts ?? [], regions: UZBEKISTAN_REGIONS };
}
