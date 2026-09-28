import { describe, expect, it } from 'vitest';

import { listCategories } from '@/modules/catalog/queries';
import { marketplace } from '@/test/fixtures';
import { CITIES } from './cities';
import { LOCALES } from './i18n/config';
import { categoryAbout, cityAbout } from './place-texts';

// A search result shows about 150 characters; a page whose description is its
// neighbour's, or a few words long, says nothing about it.

const fits = (text: string) => text.length >= 100 && text.length <= 170;

describe('category and city descriptions', () => {
  it('every city has its own text in both languages that names it', () => {
    const texts = CITIES.flatMap((city) => LOCALES.map((locale) => {
      const text = cityAbout(city.slug, locale) ?? '';
      expect(fits(text), `${city.slug}/${locale}: ${text.length}`).toBe(true);
      // «Farg‘onadagi», «в Бухаре»: the name as the sentence needs it.
      expect(text).toContain(locale === 'uz' ? city.uz : city.ru.slice(0, -1));
      return text;
    }));
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('every category on the site has its own text; one added later gets one with its name', async () => {
    const categories = await listCategories(await marketplace());
    expect(categories).toHaveLength(8);
    const texts = categories.flatMap((category) => LOCALES.map((locale) => {
      const text = categoryAbout(category, locale);
      expect(fits(text), `${category.slug}/${locale}: ${text.length}`).toBe(true);
      expect(text).not.toContain('«');
      return text;
    }));
    expect(new Set(texts).size).toBe(texts.length);

    const added = { slug: 'kitoblar', nameUz: 'Kitoblar', nameRu: 'Книги' };
    expect(categoryAbout(added, 'uz')).toContain('«Kitoblar»');
    expect(categoryAbout(added, 'ru')).toContain('«Книги»');
    expect(categoryAbout({ ...added, nameRu: null }, 'ru')).toContain('«Kitoblar»');
    expect(categoryAbout({ slug: 'constructor', nameUz: 'Boshqa', nameRu: null }, 'uz')).toContain('«Boshqa»');
  });

  it('a place that is not one of the cities has no text', () => {
    for (const slug of [undefined, null, '', 'moscow', 'constructor', '__proto__']) expect(cityAbout(slug, 'uz')).toBeNull();
  });

  it('Uzbek texts write o‘ and g‘ with the letter mark, not a plain quote', () => {
    const uzbek = [...CITIES.map((city) => cityAbout(city.slug, 'uz') ?? ''), categoryAbout({ slug: 'x', nameUz: 'X', nameRu: null }, 'uz')];
    for (const text of uzbek) expect(text).not.toMatch(/['`ʻ]/);
  });
});
