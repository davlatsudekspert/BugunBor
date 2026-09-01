'use client';

import { formatDistanceKm, haversineDistanceKm } from '@/lib/geo';
import { useLocation } from './location-provider';

/**
 * Renders nothing until the visitor grants location access — BugunBor never
 * shows a distance it doesn't actually know (see the old hardcoded
 * "1.2 + index * 1.4 km" this replaced).
 */
export function DistanceBadge({ latitudeE6, longitudeE6, prefix = '' }: { latitudeE6: number; longitudeE6: number; prefix?: string }) {
  const { coords } = useLocation();
  if (!coords) return null;
  const km = haversineDistanceKm(latitudeE6, longitudeE6, coords.latitude, coords.longitude);
  return (
    <>
      {prefix}
      {formatDistanceKm(km)}
    </>
  );
}
