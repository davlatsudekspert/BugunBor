import { describe, expect, it } from 'vitest';

import { isOpenAt, minutesUntilOpen, openState, parseHours } from './hours';

// 2026-09-25 06:00 UTC = 11:00 in Tashkent.
const at = (tashkentTime: string) => new Date(`2026-09-25T${tashkentTime}:00+05:00`);

describe('working hours', () => {
  it('reads the current and legacy shapes', () => {
    expect(parseHours('{"open":"09:00","close":"23:00"}')).toEqual({ open: '09:00', close: '23:00' });
    expect(parseHours('{"mon-sun":"10:00-22:00"}')).toEqual({ open: '10:00', close: '22:00' });
    expect(parseHours('{}')).toBeNull();
    expect(parseHours('not json')).toBeNull();
  });

  it('knows when a branch is open, including overnight and 24h', () => {
    const day = { open: '09:00', close: '23:00' };
    expect(isOpenAt(day, at('11:00'))).toBe(true);
    expect(isOpenAt(day, at('23:30'))).toBe(false);
    const night = { open: '18:00', close: '02:00' };
    expect(isOpenAt(night, at('01:00'))).toBe(true);
    expect(isOpenAt(night, at('12:00'))).toBe(false);
    expect(openState({ open: '00:00', close: '00:00' }, at('04:00'))).toEqual({ open: true, until: null });
  });

  it('says when a closed branch opens', () => {
    const day = { open: '09:00', close: '23:00' };
    expect(openState(day, at('07:30'))).toEqual({ open: false, opensAt: '09:00' });
    expect(minutesUntilOpen(day, at('07:30'))).toBe(90);
    expect(minutesUntilOpen(day, at('23:30'))).toBe(570);
    expect(minutesUntilOpen(day, at('12:00'))).toBe(0);
  });
});
