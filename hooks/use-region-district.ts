'use client';

import { useState } from 'react';

import { findRegion, UZBEKISTAN_REGIONS } from '@/lib/uzbekistan-regions';

/**
 * Drives a viloyat -> tuman/shahar cascading select: picking a new region
 * resets the district. When `allowWholeRegion` is true (search filters), the
 * reset district is "" — an empty selection meaning "butun viloyat" (the
 * whole region) — rather than an arbitrary specific district, which matters
 * when a business must pick one real place (onboarding never allows this).
 */
export function useRegionDistrict(defaultRegion?: string, defaultDistrict?: string, allowWholeRegion = false) {
  const [region, setRegionState] = useState(defaultRegion ?? UZBEKISTAN_REGIONS[0].name);
  const selectedRegion = findRegion(region) ?? UZBEKISTAN_REGIONS[0];
  const [district, setDistrict] = useState(defaultDistrict ?? (allowWholeRegion ? '' : selectedRegion.districts[0]));

  function setRegion(nextRegionName: string) {
    setRegionState(nextRegionName);
    const nextRegion = findRegion(nextRegionName) ?? UZBEKISTAN_REGIONS[0];
    setDistrict(allowWholeRegion ? '' : nextRegion.districts[0]);
  }

  return { region, setRegion, district, setDistrict, districts: selectedRegion.districts, regions: UZBEKISTAN_REGIONS };
}
