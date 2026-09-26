// A deal without an uploaded photo shows an illustrated visual: an emoji on a
// brand-toned gradient. Businesses choose it in the deal form; demo deals show a
// real photo of the same kind (lib/stock-photos.ts). Keys are grouped by
// category so the picker reads naturally.

export const DEAL_VISUALS = {
  // Food
  plov: { emoji: '🍚', gradient: 'from-[#ff895d] to-[#f44e2f]' },
  noodles: { emoji: '🍜', gradient: 'from-[#f59e5d] to-[#df542c]' },
  shashlik: { emoji: '🍖', gradient: 'from-[#f08a4b] to-[#c2410c]' },
  meat: { emoji: '🥘', gradient: 'from-[#e88a5a] to-[#b4432a]' },
  dumplings: { emoji: '🥟', gradient: 'from-[#f5b77a] to-[#d9803f]' },
  samsa: { emoji: '🥧', gradient: 'from-[#f4bf73] to-[#d38a38]' },
  bread: { emoji: '🫓', gradient: 'from-[#f2c27b] to-[#c98a3c]' },
  soup: { emoji: '🍲', gradient: 'from-[#f0a36b] to-[#c9582f]' },
  chicken: { emoji: '🍗', gradient: 'from-[#f4b35e] to-[#d07a2b]' },
  lunch: { emoji: '🍱', gradient: 'from-[#f59e6b] to-[#d45a3a]' },
  burger: { emoji: '🍔', gradient: 'from-[#f6b24e] to-[#e0762a]' },
  pizza: { emoji: '🍕', gradient: 'from-[#ff9f6b] to-[#e5533a]' },
  wrap: { emoji: '🌯', gradient: 'from-[#f3c06f] to-[#d88935]' },
  salad: { emoji: '🥗', gradient: 'from-[#8fd19e] to-[#2f9e62]' },
  sushi: { emoji: '🍣', gradient: 'from-[#ff9a8b] to-[#e0475b]' },
  // Cafés and sweets
  coffee: { emoji: '☕', gradient: 'from-[#c08a5b] to-[#6f4328]' },
  breakfast: { emoji: '🍳', gradient: 'from-[#ffd36e] to-[#e9a23b]' },
  tea: { emoji: '🍵', gradient: 'from-[#9fd49a] to-[#4f9a5a]' },
  cake: { emoji: '🍰', gradient: 'from-[#f3ba61] to-[#d9852e]' },
  dessert: { emoji: '🧁', gradient: 'from-[#f7a8c4] to-[#d9587f]' },
  icecream: { emoji: '🍨', gradient: 'from-[#f9b4d0] to-[#e0719f]' },
  sweets: { emoji: '🍬', gradient: 'from-[#f7b2c8] to-[#d45b8a]' },
  // Shopping
  shopping: { emoji: '🛍️', gradient: 'from-[#6fa8dc] to-[#2f5f8f]' },
  clothes: { emoji: '👗', gradient: 'from-[#c79bf2] to-[#7c4dbd]' },
  sneakers: { emoji: '👟', gradient: 'from-[#8fb8e8] to-[#3d6fb0]' },
  backpack: { emoji: '🎒', gradient: 'from-[#f59a8a] to-[#cf4d4d]' },
  books: { emoji: '📚', gradient: 'from-[#345a76] to-[#18334c]' },
  gift: { emoji: '🎁', gradient: 'from-[#ff8a8a] to-[#d63f5c]' },
  nuts: { emoji: '🥜', gradient: 'from-[#f2b56b] to-[#b86a2c]' },
  kitchen: { emoji: '🍽️', gradient: 'from-[#a9b8c8] to-[#56687c]' },
  flowers: { emoji: '💐', gradient: 'from-[#f7a6c0] to-[#d2477a]' },
  phone: { emoji: '📱', gradient: 'from-[#7fa7d8] to-[#35598d]' },
  crafts: { emoji: '🏺', gradient: 'from-[#6fb1d6] to-[#2a6f9e]' },
  fabric: { emoji: '🧵', gradient: 'from-[#c9a0f0] to-[#8150c4]' },
  suzani: { emoji: '🪡', gradient: 'from-[#f59ab0] to-[#c2415f]' },
  doppi: { emoji: '🧢', gradient: 'from-[#5f7186] to-[#1f2d3d]' },
  woodcarving: { emoji: '🪵', gradient: 'from-[#d6a77a] to-[#8a5a33]' },
  doll: { emoji: '🪆', gradient: 'from-[#8fb3e8] to-[#3f63a8]' },
  // Beauty
  beauty: { emoji: '💅', gradient: 'from-[#f7a1c1] to-[#c2477a]' },
  makeup: { emoji: '💄', gradient: 'from-[#f59ab6] to-[#b83a6b]' },
  hair: { emoji: '💇', gradient: 'from-[#f5a3b8] to-[#c85a7f]' },
  barber: { emoji: '💈', gradient: 'from-[#8fb0d9] to-[#3f5f8f]' },
  spa: { emoji: '💆', gradient: 'from-[#b7d9c9] to-[#5f9f86]' },
  facial: { emoji: '🧖', gradient: 'from-[#b9e0d4] to-[#4f9784]' },
  // Sport
  fitness: { emoji: '🏋️', gradient: 'from-[#5ec4b6] to-[#1f7a70]' },
  pool: { emoji: '🏊', gradient: 'from-[#6cc7e6] to-[#2385b3]' },
  yoga: { emoji: '🧘', gradient: 'from-[#a9d8b8] to-[#4d9d74]' },
  football: { emoji: '⚽', gradient: 'from-[#7fd08a] to-[#2f8f45]' },
  boxing: { emoji: '🥊', gradient: 'from-[#f08a8a] to-[#c23b3b]' },
  kurash: { emoji: '🤼', gradient: 'from-[#7fb2e0] to-[#2e6aa3]' },
  tennis: { emoji: '🎾', gradient: 'from-[#c8e36b] to-[#7fa82a]' },
  // Entertainment
  fun: { emoji: '🎉', gradient: 'from-[#9d8cf5] to-[#5a47c9]' },
  cinema: { emoji: '🎬', gradient: 'from-[#9d8cf5] to-[#5a47c9]' },
  bowling: { emoji: '🎳', gradient: 'from-[#8fa3f5] to-[#4a5bc9]' },
  quest: { emoji: '🔐', gradient: 'from-[#7d8cc4] to-[#39447a]' },
  kids: { emoji: '🧸', gradient: 'from-[#ffc07a] to-[#e8843a]' },
  karaoke: { emoji: '🎤', gradient: 'from-[#e39cf0] to-[#a24ec2]' },
  game: { emoji: '🎮', gradient: 'from-[#8f9cf7] to-[#4b4fc9]' },
  billiards: { emoji: '🎱', gradient: 'from-[#6fcf9a] to-[#1f7a4d]' },
  theater: { emoji: '🎭', gradient: 'from-[#d88fa8] to-[#9c3f63]' },
  horse: { emoji: '🐎', gradient: 'from-[#d2a679] to-[#8b5a2b]' },
  // Services
  service: { emoji: '🛠️', gradient: 'from-[#8aa0b4] to-[#40566b]' },
  car: { emoji: '🚗', gradient: 'from-[#7ab6e6] to-[#2f6fa8]' },
  tires: { emoji: '🛞', gradient: 'from-[#8e9aa8] to-[#3c4652]' },
  laundry: { emoji: '👔', gradient: 'from-[#9fb8d6] to-[#4c6a8f]' },
  repair: { emoji: '🔧', gradient: 'from-[#9aa8b6] to-[#4a5a6b]' },
  laptop: { emoji: '💻', gradient: 'from-[#8fa8c8] to-[#3e5578]' },
  shoes: { emoji: '👞', gradient: 'from-[#c9a07a] to-[#7a5233]' },
  sewing: { emoji: '✂️', gradient: 'from-[#b9a3e8] to-[#6a4fb3]' },
  cleaning: { emoji: '🧹', gradient: 'from-[#8fd6c8] to-[#2f9483]' },
  camera: { emoji: '📸', gradient: 'from-[#a3a9c9] to-[#4f577f]' },
  education: { emoji: '🎓', gradient: 'from-[#7f9fd6] to-[#34508f]' },
  computer: { emoji: '🖥️', gradient: 'from-[#86a6d9] to-[#35528c]' },
  // Delivery
  delivery: { emoji: '🛵', gradient: 'from-[#63c3a0] to-[#1f8a63]' },
  fruit: { emoji: '🍎', gradient: 'from-[#f79a8a] to-[#d8433b]' },
  water: { emoji: '💧', gradient: 'from-[#8fd3f2] to-[#2e8fc2]' },
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
  return Boolean(value && Object.hasOwn(DEAL_VISUALS, value));
}

export function dealVisual(visual: string | null | undefined, categorySlug?: string | null) {
  const key: DealVisualKey = isDealVisual(visual) ? visual : (categoryDefaults[categorySlug ?? ''] ?? 'gift');
  return { key, ...DEAL_VISUALS[key] };
}
