// Search text is stored lowercased and transliterated to Latin so that
// "osh", "ош", "O‘sh" and "Osh" all match each other. SQLite's LIKE is only
// case-insensitive for ASCII, so normalization happens in JavaScript.

const cyrillicToLatin: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};

const APOSTROPHES = /['‘’ʻʼ`´]/g;

export function normalizeSearchText(value: string) {
  const lowered = value.toLowerCase().normalize('NFKC');
  let latin = '';
  for (const char of lowered) latin += cyrillicToLatin[char] ?? char;
  return latin
    .replace(APOSTROPHES, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function buildSearchText(...parts: Array<string | null | undefined>) {
  return normalizeSearchText(parts.filter(Boolean).join(' '));
}

/** LIKE pattern for a user query, or null when the query is empty. */
export function searchPattern(query: string | null | undefined) {
  const normalized = normalizeSearchText(query ?? '').slice(0, 80);
  if (!normalized) return null;
  return `%${normalized.replace(/[%_]/g, '')}%`;
}

export function slugify(value: string, fallback = 'item') {
  const slug = normalizeSearchText(value)
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug || fallback;
}
