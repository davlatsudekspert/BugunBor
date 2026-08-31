import { describe, expect, it } from 'vitest';
import { boundingBoxE6, haversineKm } from './distance';

const tashkentCenter = { lat: 41.311081, lng: 69.279737 };
const chilonzor = { lat: 41.28, lng: 69.201 }; // roughly 6.9 km southwest

describe('haversineKm', () => {
  it('returns 0 for identical points', () =>
    expect(haversineKm(tashkentCenter, tashkentCenter)).toBeCloseTo(0, 5));
  it('estimates a known Tashkent distance within 5%', () => {
    const distance = haversineKm(tashkentCenter, chilonzor);
    expect(distance).toBeGreaterThan(6);
    expect(distance).toBeLessThan(8);
  });
});

describe('boundingBoxE6', () => {
  it('contains a point known to be within the radius', () => {
    const box = boundingBoxE6(tashkentCenter, 10);
    const pointE6 = {
      latE6: Math.round(chilonzor.lat * 1_000_000),
      lngE6: Math.round(chilonzor.lng * 1_000_000),
    };
    expect(pointE6.latE6).toBeGreaterThanOrEqual(box.minLatE6);
    expect(pointE6.latE6).toBeLessThanOrEqual(box.maxLatE6);
    expect(pointE6.lngE6).toBeGreaterThanOrEqual(box.minLngE6);
    expect(pointE6.lngE6).toBeLessThanOrEqual(box.maxLngE6);
  });

  it('shrinks as the radius shrinks', () => {
    const wide = boundingBoxE6(tashkentCenter, 50);
    const narrow = boundingBoxE6(tashkentCenter, 1);
    expect(narrow.maxLatE6 - narrow.minLatE6).toBeLessThan(
      wide.maxLatE6 - wide.minLatE6,
    );
  });
});
