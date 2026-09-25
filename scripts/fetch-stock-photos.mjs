#!/usr/bin/env node
// Downloads freely licensed ORIGINAL photos (real photographs, not AI) from
// Wikimedia Commons for every deal visual, converts them to WebP and writes
// public/photos/*.webp plus lib/stock-photos.ts with author and licence.
// They are shown only on demo deals; /credits lists the authors.
//
//   node scripts/fetch-stock-photos.mjs            # all visuals
//   node scripts/fetch-stock-photos.mjs plov samsa # only these keys
//
// Needs network access to commons.wikimedia.org and upload.wikimedia.org.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const sharp = createRequire(import.meta.url)('sharp');
const ROOT = new URL('..', import.meta.url).pathname;
const API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'BugunBor/1.0 (https://bugunbor.uz; demo catalogue photos)';

// Search queries per visual, most specific first. Uzbek dishes first try Uzbek sources.
const QUERIES = {
  plov: ['Uzbek plov', 'Osh plov Uzbekistan', 'pilaf Uzbekistan'],
  noodles: ['Lagman Uzbek', 'lagman noodles'],
  shashlik: ['Shashlik Uzbekistan', 'shashlik skewers'],
  meat: ['Kazan kabob', 'Uzbek meat dish', 'Tandir gosht'],
  dumplings: ['Manti Uzbek', 'Chuchvara', 'manti dumplings'],
  bread: ['Samsa Uzbekistan', 'Uzbek bread non', 'Samarkand bread'],
  soup: ['Shurpa soup', 'Mastava soup', 'Dimlama'],
  chicken: ['roast chicken dish', 'grilled chicken plate'],
  lunch: ['business lunch plate', 'set lunch tray'],
  burger: ['hamburger with fries', 'cheeseburger'],
  pizza: ['pizza margherita', 'pepperoni pizza'],
  wrap: ['shawarma wrap', 'lavash shawarma'],
  salad: ['achichuk salad', 'fresh vegetable salad'],
  sushi: ['sushi set plate', 'sushi rolls'],
  coffee: ['cappuccino cup', 'latte art'],
  breakfast: ['breakfast omelette plate', 'cafe breakfast'],
  tea: ['Uzbek tea choynak piyola', 'green tea teapot bowl'],
  cake: ['cake slice', 'birthday cake'],
  dessert: ['cupcakes', 'pastry dessert'],
  icecream: ['ice cream scoops', 'gelato'],
  sweets: ['halva', 'oriental sweets'],
  shopping: ['shopping bags', 'grocery basket'],
  clothes: ['clothing store rack', 'clothes shop'],
  books: ['bookstore shelves', 'books stack'],
  gift: ['gift box ribbon', 'dried fruits nuts gift'],
  flowers: ['bouquet of roses', 'flower shop'],
  phone: ['smartphone accessories', 'phone cases'],
  crafts: ['Rishtan ceramics', 'Uzbek ceramics bowls'],
  fabric: ['Margilan silk ikat', 'Uzbek ikat fabric', 'suzani'],
  beauty: ['manicure nails', 'nail salon'],
  hair: ['hairdresser salon', 'hair salon'],
  barber: ['barbershop', 'barber chair'],
  spa: ['massage therapy', 'spa treatment'],
  fitness: ['gym dumbbells', 'fitness center'],
  pool: ['indoor swimming pool', 'swimming pool lanes'],
  yoga: ['yoga class', 'yoga mat'],
  football: ['futsal', 'football pitch'],
  boxing: ['boxing gloves', 'boxing ring'],
  tennis: ['tennis court', 'tennis racket ball'],
  fun: ['amusement park', 'family entertainment center'],
  cinema: ['cinema hall seats', 'movie theater'],
  bowling: ['bowling alley', 'bowling pins'],
  quest: ['escape room', 'padlock'],
  kids: ['indoor playground', 'children playground'],
  karaoke: ['karaoke room', 'microphone stage'],
  game: ['game controller', 'video game console'],
  theater: ['theatre stage', 'Alisher Navoi Theater'],
  horse: ['horse riding', 'Karabair horse'],
  service: ['workshop tools', 'repair shop'],
  car: ['car wash', 'car washing'],
  laundry: ['dry cleaning', 'laundry shop'],
  repair: ['laptop repair', 'electronics repair'],
  cleaning: ['house cleaning', 'cleaning supplies'],
  camera: ['photo studio', 'photography studio'],
  education: ['classroom', 'language school class'],
  delivery: ['food delivery scooter', 'food delivery courier'],
  fruit: ['fruit basket', 'Uzbekistan fruits bazaar'],
  water: ['water cooler bottle', 'drinking water bottles'],
};

// Commercial use and modification allowed; attribution handled on /credits.
const ALLOWED = /^(cc0|public domain|pd|cc by(-sa)? (2\.0|2\.5|3\.0|4\.0))/i;

const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function search(query) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', generator: 'search', gsrnamespace: '6', gsrlimit: '15',
    gsrsearch: `${query} filetype:bitmap`, prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1600',
  });
  const response = await fetch(`${API}?${params}`, { headers: { 'user-agent': USER_AGENT } });
  if (!response.ok) throw new Error(`search ${response.status}`);
  const data = await response.json();
  return (data.query?.pages ?? []).sort((a, b) => a.index - b.index);
}

function acceptable(page) {
  const info = page.imageinfo?.[0];
  if (!info || info.mime !== 'image/jpeg' || info.width < 1000 || info.height < 700) return null;
  const meta = info.extmetadata ?? {};
  const license = strip(meta.LicenseShortName?.value);
  if (!ALLOWED.test(license) || /nc|nd/i.test(license)) return null;
  return {
    url: info.thumburl ?? info.url,
    title: page.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''),
    author: strip(meta.Artist?.value) || 'Wikimedia Commons',
    license,
    licenseUrl: meta.LicenseUrl?.value ?? 'https://commons.wikimedia.org/wiki/Commons:Licensing',
    source: info.descriptionurl,
  };
}

async function fetchPhoto(key) {
  for (const query of QUERIES[key]) {
    for (const page of await search(query)) {
      const photo = acceptable(page);
      if (!photo) continue;
      const response = await fetch(photo.url, { headers: { 'user-agent': USER_AGENT } });
      if (!response.ok) continue;
      const input = Buffer.from(await response.arrayBuffer());
      const webp = await sharp(input).rotate().resize(1280, 960, { fit: 'cover', position: 'attention' }).webp({ quality: 80 }).toBuffer();
      await writeFile(`${ROOT}public/photos/${key}.webp`, webp);
      return { ...photo, src: `/photos/${key}.webp`, bytes: webp.length };
    }
  }
  return null;
}

async function existing() {
  try {
    const source = await readFile(`${ROOT}lib/stock-photos.ts`, 'utf8');
    const json = source.match(/STOCK_PHOTOS: Record<string, StockPhoto> = (\{[\s\S]*\});/)?.[1];
    return json ? JSON.parse(json) : {};
  } catch {
    return {};
  }
}

const keys = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(QUERIES);
const reachable = await fetch(`${API}?action=query&meta=siteinfo&format=json`, { headers: { 'user-agent': USER_AGENT } }).then((response) => response.ok, () => false);
if (!reachable) {
  console.error('commons.wikimedia.org is not reachable. Allow commons.wikimedia.org and upload.wikimedia.org in the network settings and run again.');
  process.exit(1);
}

await mkdir(`${ROOT}public/photos`, { recursive: true });
const photos = await existing();
for (const key of keys) {
  if (!QUERIES[key]) {
    console.warn(`unknown visual: ${key}`);
    continue;
  }
  try {
    const photo = await fetchPhoto(key);
    if (!photo) {
      console.warn(`✗ ${key}: nothing suitable found`);
      continue;
    }
    const { bytes, url: _url, ...entry } = photo;
    photos[key] = entry;
    console.log(`✓ ${key}: ${entry.title} — ${entry.author} (${entry.license}), ${Math.round(bytes / 1024)} KB`);
  } catch (error) {
    console.warn(`✗ ${key}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const header = `// Generated by scripts/fetch-stock-photos.mjs: freely licensed original photos
// (Wikimedia Commons) keyed by deal visual, shown only on demo deals.
// Regenerate with the script instead of editing by hand.

export type StockPhoto = { src: string; title: string; author: string; license: string; licenseUrl: string; source: string };

`;
await writeFile(`${ROOT}lib/stock-photos.ts`, `${header}export const STOCK_PHOTOS: Record<string, StockPhoto> = ${JSON.stringify(photos, null, 2)};\n`);
console.log(`\n${Object.keys(photos).length} photos in lib/stock-photos.ts`);
