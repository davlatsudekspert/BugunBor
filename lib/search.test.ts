import { describe, expect, it } from 'vitest';

import { normalizeSearchText, searchPattern, wordSearchPattern } from './search';

describe('search text', () => {
  it('matches Latin, Cyrillic and apostrophe spellings alike', () => {
    expect(normalizeSearchText('O‘sh')).toBe('osh');
    expect(normalizeSearchText('Ош')).toBe('osh');
    expect(normalizeSearchText('  Qo‘shimcha,  NON! ')).toBe('qoshimcha non');
  });

  it('catalogue queries start a word; admin queries match anywhere', () => {
    expect(wordSearchPattern('Osh')).toBe('% osh%');
    expect(wordSearchPattern('  ')).toBeNull();
    expect(wordSearchPattern('50%_off')).toBe('% 50 off%');
    expect(searchPattern('osh')).toBe('%osh%');
  });
});
