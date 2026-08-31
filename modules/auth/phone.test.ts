import { describe, expect, it } from 'vitest';
import { normalizeUzbekPhone } from './phone';

describe('normalizeUzbekPhone', () => {
  it.each([
    ['90 123 45 67', '+998901234567'],
    ['+998 (90) 123-45-67', '+998901234567'],
    ['00998901234567', '+998901234567'],
  ])('normalizes %s', (input, expected) => expect(normalizeUzbekPhone(input)).toBe(expected));
  it.each(['123', '+997901234567', '+9989012345678'])('rejects %s', (input) => expect(() => normalizeUzbekPhone(input)).toThrow('INVALID_UZ_PHONE'));
});
