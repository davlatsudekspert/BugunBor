import { describe, expect, it } from 'vitest';

import { firstValues } from './search-params';

describe('page parameters', () => {
  it('keeps the first of a repeated parameter', () => {
    expect(firstValues({ q: ['osh', 'plov'], city: 'tashkent', page: undefined })).toEqual({ q: 'osh', city: 'tashkent', page: undefined });
  });
});
