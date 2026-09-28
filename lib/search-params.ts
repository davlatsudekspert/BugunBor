/** What a page receives: a name given twice (?q=a&q=b) arrives as a list. */
export type SearchParams = Record<string, string | string[] | undefined>;

/** One value per name (the first), so a repeated parameter never breaks a page. */
export function firstValues(params: SearchParams): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
}
