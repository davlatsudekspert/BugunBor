// A set («to‘plam»): one deal that is several dishes or items together, as
// restaurants and cafes sell them ("2 osh, 2 salat, choy — 4 kishilik").
// Kept on the deal as JSON; a regular deal has none.

export type SetItem = { name: string; qty: number };
export type DealSet = { items: SetItem[]; persons: number | null };

export const SET_RULES = { minItems: 2, maxItems: 12, maxQty: 20, maxPersons: 20, nameMin: 2, nameMax: 60 } as const;

/** The stored set, or null for a regular deal (or anything unreadable). */
export function parseDealSet(itemsJson: string | null | undefined, persons: number | null | undefined): DealSet | null {
  if (!itemsJson) return null;
  let value: unknown;
  try {
    value = JSON.parse(itemsJson);
  } catch {
    return null;
  }
  if (!Array.isArray(value)) return null;
  const items = value.flatMap((item): SetItem[] => {
    if (!item || typeof item !== 'object') return [];
    const { name, qty } = item as Record<string, unknown>;
    if (typeof name !== 'string' || !name.trim()) return [];
    const count = typeof qty === 'number' && Number.isInteger(qty) && qty >= 1 ? Math.min(qty, SET_RULES.maxQty) : 1;
    return [{ name: name.trim(), qty: count }];
  });
  if (!items.length) return null;
  return { items, persons: typeof persons === 'number' && persons >= 1 ? persons : null };
}

/** Two empty lines for the form to start a set with (quantities as the form keeps them). */
export const emptySetItems = () => [{ name: '', qty: '1' }, { name: '', qty: '1' }];

export function serializeSetItems(items: SetItem[]) {
  return JSON.stringify(items.map((item) => ({ name: item.name.trim(), qty: item.qty })));
}

/** One line for a card: "2× Osh · 2× Salat · Choy". */
export function setSummary(set: DealSet) {
  return set.items.map((item) => (item.qty > 1 ? `${item.qty}× ${item.name}` : item.name)).join(' · ');
}
