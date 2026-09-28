import { describe, expect, it, vi } from 'vitest';

vi.mock('@/db/client', () => ({ getDb: async () => null }));

const { GET: switchTo } = await import('./[locale]/route');

// The language switch: remembers the choice and goes back to the page at its
// address in that language.

const go = async (locale: string, next: string) => {
  const response = await switchTo(new Request(`https://bugunbor.uz/lang/${locale}?next=${encodeURIComponent(next)}`), { params: Promise.resolve({ locale }) });
  return [response.headers.get('location'), response.headers.get('set-cookie')?.split(';')[0]];
};

describe('the language switch', () => {
  it('takes a page to its /ru/ address and back, and keeps personal pages where they are', async () => {
    expect(await go('ru', '/deals/osh')).toEqual(['/ru/deals/osh', 'bb_locale=ru']);
    expect(await go('ru', '/')).toEqual(['/ru', 'bb_locale=ru']);
    expect(await go('ru', '/discover?city=samarkand')).toEqual(['/ru/discover?city=samarkand', 'bb_locale=ru']);
    expect(await go('uz', '/ru/deals/osh')).toEqual(['/deals/osh', 'bb_locale=uz']);
    expect(await go('ru', '/account/codes')).toEqual(['/account/codes', 'bb_locale=ru']);
    // Somewhere else entirely is not a place to go back to.
    expect(await go('ru', 'https://example.com/x')).toEqual(['/ru', 'bb_locale=ru']);
  });
});
