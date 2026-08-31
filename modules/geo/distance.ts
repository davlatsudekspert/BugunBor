const EARTH_RADIUS_KM = 6371;

export type LatLng = { lat: number; lng: number };

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * A generous lat/lng (E6-scaled integer) bounding box around `center` that fully contains
 * everything within `radiusKm`. Used to cheaply pre-filter rows in SQL (indexed range scan)
 * before computing the exact haversine distance in application code — SQLite has no
 * portable trig functions to rely on inside D1.
 */
export function boundingBoxE6(center: LatLng, radiusKm: number) {
  const latDelta = (radiusKm / 111.32) * 1_000_000;
  const lngScale = Math.max(0.05, Math.cos((center.lat * Math.PI) / 180));
  const lngDelta = (radiusKm / (111.32 * lngScale)) * 1_000_000;
  return {
    minLatE6: Math.round(center.lat * 1_000_000 - latDelta),
    maxLatE6: Math.round(center.lat * 1_000_000 + latDelta),
    minLngE6: Math.round(center.lng * 1_000_000 - lngDelta),
    maxLngE6: Math.round(center.lng * 1_000_000 + lngDelta),
  };
}

/** Distance presets offered in the location filter (section 3 of the product spec). */
export const RADIUS_PRESETS_KM = [1, 3, 5, 10, 25, 50] as const;
