import { describe, expect, it } from 'vitest';

import { safeReturnPath } from './http';

describe('return path after login or a language switch', () => {
  it('keeps paths on this site', () => {
    expect(safeReturnPath('/account/codes')).toBe('/account/codes');
    expect(safeReturnPath('/discover?q=osh&city=tashkent#top')).toBe('/discover?q=osh&city=tashkent#top');
    expect(safeReturnPath('/deals/osh-1', '/account')).toBe('/deals/osh-1');
  });

  it('never leads to another site', () => {
    for (const value of [
      'https://evil.example/',
      '//evil.example',
      '/\\evil.example',
      '/\t/evil.example',
      '/\n/evil.example',
      '/\r\n//evil.example',
      '\t//evil.example',
      'javascript:alert(1)',
      'evil.example',
      '',
      '/'.padEnd(501, 'a'),
    ]) {
      expect(safeReturnPath(value, '/fallback'), JSON.stringify(value)).toBe('/fallback');
    }
    expect(safeReturnPath(undefined)).toBe('/');
    expect(safeReturnPath(['/account'])).toBe('/');
  });
});
