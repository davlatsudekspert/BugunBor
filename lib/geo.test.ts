import { describe, expect, it } from 'vitest';
import { formatDistanceKm, haversineDistanceKm } from './geo';

describe('haversineDistanceKm', () => {
  it('returns ~0 for the same point', () => {
    // Amir Temur square, Tashkent.
    expect(haversineDistanceKm(41_311_200, 69_279_300, 41.3112, 69.2793)).toBeCloseTo(0, 1);
  });

  it('matches a known real-world distance (Tashkent to Samarqand, ~260km)', () => {
    const distance = haversineDistanceKm(41_311_200, 69_279_300, 39.6542, 66.9597);
    expect(distance).toBeGreaterThan(240);
    expect(distance).toBeLessThan(280);
  });

  it('is symmetric', () => {
    const a = haversineDistanceKm(41_311_200, 69_279_300, 41.285, 69.222);
    const b = haversineDistanceKm(41_285_000, 69_222_000, 41.3112, 69.2793);
    expect(a).toBeCloseTo(b, 5);
  });
});

describe('formatDistanceKm', () => {
  it('shows meters under 1km', () => expect(formatDistanceKm(0.7)).toBe('700 m'));
  it('shows kilometers with a comma decimal above 1km', () => expect(formatDistanceKm(1.8)).toBe('1,8 km'));
  it('never shows 0 m for a nonzero distance', () => expect(formatDistanceKm(0.0002)).toBe('1 m'));
});
