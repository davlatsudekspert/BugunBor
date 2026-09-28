// Small fixes for text people type into forms: shouting in capitals and
// address words written in different ways. Used when a form is saved and when
// older records are shown, so both look the same.

const LETTER = /\p{L}/gu;

/**
 * "DASTURXON VA PARDALAR" → "Dasturxon va pardalar": a text typed with Caps
 * Lock on becomes ordinary sentences. Short texts (a brand like "KFC") and
 * texts with a few capitals in them are left as they are.
 */
export function calmCaps(text: string): string {
  const letters = text.match(LETTER) ?? [];
  if (letters.length < 12) return text;
  const capitals = letters.filter((letter) => letter !== letter.toLowerCase()).length;
  if (capitals / letters.length < 0.8) return text;
  return text
    .toLowerCase()
    .replace(/(^\s*|[.!?…]\s+|\n\s*)(\p{L})/gu, (_, before: string, letter: string) => before + letter.toUpperCase());
}

// Words that follow a name in an Uzbek address: «Andijon shahri», «Farobiy ko‘chasi».
const ADDRESS_WORDS = /(?<=\S\s+)(Shahar|Shahri|Tumani|Viloyati|Ko['‘’`ʻ]chasi|Mahallasi|Massivi|Mavzesi|Kvartali|Uy|Xonadon)(?=[\s,.]|$)/gu;

/** "Andijon Shahar" and "andijon shahar" both become "Andijon shahar"; the rest is kept. */
export function tidyAddress(address: string): string {
  const trimmed = calmCaps(address.trim().replace(/\s+/g, ' '));
  const first = trimmed.charAt(0);
  return (first.toUpperCase() + trimmed.slice(1)).replace(ADDRESS_WORDS, (word) => word.toLowerCase());
}
