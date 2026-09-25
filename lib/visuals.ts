// Deals have no uploaded photos yet, so each one picks an illustrated visual:
// an emoji on a brand-toned gradient. Businesses choose it in the deal form.

export const DEAL_VISUALS = {
  plov: { emoji: '🍚', gradient: 'from-[#ff895d] to-[#f44e2f]' },
  noodles: { emoji: '🍜', gradient: 'from-[#f59e5d] to-[#df542c]' },
  shashlik: { emoji: '🍢', gradient: 'from-[#f08a4b] to-[#c2410c]' },
  burger: { emoji: '🍔', gradient: 'from-[#f6b24e] to-[#e0762a]' },
  pizza: { emoji: '🍕', gradient: 'from-[#ff9f6b] to-[#e5533a]' },
  salad: { emoji: '🥗', gradient: 'from-[#8fd19e] to-[#2f9e62]' },
  sushi: { emoji: '🍣', gradient: 'from-[#ff9a8b] to-[#e0475b]' },
  cake: { emoji: '🍰', gradient: 'from-[#f3ba61] to-[#d9852e]' },
  dessert: { emoji: '🧁', gradient: 'from-[#f7a8c4] to-[#d9587f]' },
  coffee: { emoji: '☕', gradient: 'from-[#c08a5b] to-[#6f4328]' },
  books: { emoji: '📚', gradient: 'from-[#345a76] to-[#18334c]' },
  shopping: { emoji: '🛍️', gradient: 'from-[#6fa8dc] to-[#2f5f8f]' },
  clothes: { emoji: '👗', gradient: 'from-[#c79bf2] to-[#7c4dbd]' },
  gift: { emoji: '🎁', gradient: 'from-[#ff8a8a] to-[#d63f5c]' },
  beauty: { emoji: '💅', gradient: 'from-[#f7a1c1] to-[#c2477a]' },
  fitness: { emoji: '🏋️', gradient: 'from-[#5ec4b6] to-[#1f7a70]' },
  fun: { emoji: '🎬', gradient: 'from-[#9d8cf5] to-[#5a47c9]' },
  service: { emoji: '🛠️', gradient: 'from-[#8aa0b4] to-[#40566b]' },
  delivery: { emoji: '🛵', gradient: 'from-[#63c3a0] to-[#1f8a63]' },
} as const;

export type DealVisualKey = keyof typeof DEAL_VISUALS;

export const DEAL_VISUAL_KEYS = Object.keys(DEAL_VISUALS) as [DealVisualKey, ...DealVisualKey[]];

const categoryDefaults: Record<string, DealVisualKey> = {
  taomlar: 'plov',
  kofe: 'coffee',
  xaridlar: 'shopping',
  gozallik: 'beauty',
  sport: 'fitness',
  kongilochar: 'fun',
  xizmatlar: 'service',
  yetkazish: 'delivery',
};

export function isDealVisual(value: string | null | undefined): value is DealVisualKey {
  return Boolean(value && value in DEAL_VISUALS);
}

export function dealVisual(visual: string | null | undefined, categorySlug?: string | null) {
  const key: DealVisualKey = isDealVisual(visual) ? visual : (categoryDefaults[categorySlug ?? ''] ?? 'gift');
  return { key, ...DEAL_VISUALS[key] };
}
