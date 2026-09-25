export type City = {
  slug: string;
  uz: string;
  ru: string;
  latitude: number;
  longitude: number;
};

export const CITIES: readonly City[] = [
  { slug: 'tashkent', uz: 'Toshkent', ru: 'Ташкент', latitude: 41.3111, longitude: 69.2797 },
  { slug: 'samarkand', uz: 'Samarqand', ru: 'Самарканд', latitude: 39.6542, longitude: 66.9597 },
  { slug: 'bukhara', uz: 'Buxoro', ru: 'Бухара', latitude: 39.7747, longitude: 64.4286 },
  { slug: 'andijan', uz: 'Andijon', ru: 'Андижан', latitude: 40.7821, longitude: 72.3442 },
  { slug: 'fergana', uz: 'Farg‘ona', ru: 'Фергана', latitude: 40.3842, longitude: 71.7843 },
  { slug: 'namangan', uz: 'Namangan', ru: 'Наманган', latitude: 40.9983, longitude: 71.6726 },
  { slug: 'kokand', uz: 'Qo‘qon', ru: 'Коканд', latitude: 40.5286, longitude: 70.9425 },
  { slug: 'margilan', uz: 'Marg‘ilon', ru: 'Маргилан', latitude: 40.4711, longitude: 71.7247 },
  { slug: 'nurafshon', uz: 'Nurafshon', ru: 'Нурафшан', latitude: 41.0439, longitude: 69.3578 },
  { slug: 'chirchiq', uz: 'Chirchiq', ru: 'Чирчик', latitude: 41.4689, longitude: 69.5822 },
  { slug: 'navoi', uz: 'Navoiy', ru: 'Навои', latitude: 40.0844, longitude: 65.3792 },
  { slug: 'jizzakh', uz: 'Jizzax', ru: 'Джизак', latitude: 40.1158, longitude: 67.8422 },
  { slug: 'gulistan', uz: 'Guliston', ru: 'Гулистан', latitude: 40.4897, longitude: 68.7842 },
  { slug: 'karshi', uz: 'Qarshi', ru: 'Карши', latitude: 38.8606, longitude: 65.7891 },
  { slug: 'termez', uz: 'Termiz', ru: 'Термез', latitude: 37.2242, longitude: 67.2783 },
  { slug: 'urgench', uz: 'Urganch', ru: 'Ургенч', latitude: 41.55, longitude: 60.6333 },
  { slug: 'nukus', uz: 'Nukus', ru: 'Нукус', latitude: 42.4531, longitude: 59.6103 },
];

export const DEFAULT_CITY = 'tashkent';

const bySlug = new Map(CITIES.map((city) => [city.slug, city]));

export function getCity(slug: string | null | undefined): City | undefined {
  return slug ? bySlug.get(slug) : undefined;
}

export function isCitySlug(slug: string | null | undefined): slug is string {
  return Boolean(slug && bySlug.has(slug));
}

export function cityName(slug: string | null | undefined, locale: 'uz' | 'ru') {
  const city = getCity(slug);
  if (!city) return slug ?? '';
  return locale === 'ru' ? city.ru : city.uz;
}

export const CITY_SLUGS = CITIES.map((city) => city.slug) as [string, ...string[]];

export function nearestCity(point: { latitude: number; longitude: number }) {
  let best = CITIES[0];
  let bestDistance = Infinity;
  for (const city of CITIES) {
    const distance = distanceKm(point, city);
    if (distance < bestDistance) {
      best = city;
      bestDistance = distance;
    }
  }
  return best;
}

/** Great-circle distance in kilometres. */
export function distanceKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
