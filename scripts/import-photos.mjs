#!/usr/bin/env node
// Imports photos from a local folder (e.g. downloaded from Google Drive or
// Canva) as demo photos: public/photos/<visual>.webp + lib/stock-photos.ts.
// File names are visual keys or their Uzbek names: plov.jpg, lagmon.jpg,
// shashlik.png, somsa.jpg, tort.jpg, kofe.jpg, manikyur.jpg ...
//
//   node scripts/import-photos.mjs ~/Downloads/bugunbor --author "BugunBor" --license "Own photo"

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, basename, join } from 'node:path';

const sharp = createRequire(import.meta.url)('sharp');
const ROOT = new URL('..', import.meta.url).pathname;

const ALIASES = {
  osh: 'plov', palov: 'plov', lagmon: 'noodles', lagman: 'noodles', norin: 'noodles', kabob: 'shashlik', gosht: 'meat',
  manti: 'dumplings', chuchvara: 'dumplings', somsa: 'bread', non: 'bread', shorva: 'soup', mastava: 'soup', tovuq: 'chicken',
  lanch: 'lunch', pitsa: 'pizza', lavash: 'wrap', salat: 'salad', kofe: 'coffee', nonushta: 'breakfast', choy: 'tea',
  tort: 'cake', desert: 'dessert', muzqaymoq: 'icecream', holva: 'sweets', halva: 'sweets', xarid: 'shopping', kiyim: 'clothes',
  kitoblar: 'books', kitob: 'books', sovga: 'gift', gul: 'flowers', gullar: 'flowers', telefon: 'phone', sopol: 'crafts',
  atlas: 'fabric', manikyur: 'beauty', soch: 'hair', sartarosh: 'barber', massaj: 'spa', fitnes: 'fitness', basseyn: 'pool',
  futbol: 'football', boks: 'boxing', kino: 'cinema', bouling: 'bowling', kvest: 'quest', bolalar: 'kids', karaoke: 'karaoke',
  oyin: 'game', teatr: 'theater', ot: 'horse', avtoyuvish: 'car', mashina: 'car', kimyoviy: 'laundry', tamir: 'repair',
  tozalash: 'cleaning', foto: 'camera', talim: 'education', yetkazish: 'delivery', meva: 'fruit', suv: 'water',
};

const args = process.argv.slice(2);
const folder = args.find((arg) => !arg.startsWith('--'));
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
if (!folder) {
  console.error('Usage: node scripts/import-photos.mjs <folder> [--author "Name"] [--license "Own photo"]');
  process.exit(1);
}

const source = await readFile(`${ROOT}lib/stock-photos.ts`, 'utf8');
const photos = JSON.parse(source.match(/STOCK_PHOTOS: Record<string, StockPhoto> = (\{[\s\S]*\});/)?.[1] ?? '{}');
await mkdir(`${ROOT}public/photos`, { recursive: true });

for (const file of await readdir(folder)) {
  if (!/\.(jpe?g|png|webp|heic)$/i.test(file)) continue;
  const name = basename(file, extname(file)).toLowerCase().replace(/[^a-z]/g, '');
  const key = ALIASES[name] ?? name;
  try {
    const webp = await sharp(await readFile(join(folder, file))).rotate().resize(1280, 960, { fit: 'cover', position: 'attention' }).webp({ quality: 80 }).toBuffer();
    await writeFile(`${ROOT}public/photos/${key}.webp`, webp);
    photos[key] = { src: `/photos/${key}.webp`, title: basename(file, extname(file)), author: option('author', 'BugunBor'), license: option('license', 'Own photo'), licenseUrl: '/terms', source: '/credits' };
    console.log(`✓ ${file} → ${key} (${Math.round(webp.length / 1024)} KB)`);
  } catch (error) {
    console.warn(`✗ ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

await writeFile(`${ROOT}lib/stock-photos.ts`, source.replace(/STOCK_PHOTOS: Record<string, StockPhoto> = \{[\s\S]*\};/, `STOCK_PHOTOS: Record<string, StockPhoto> = ${JSON.stringify(photos, null, 2)};`));
console.log(`\n${Object.keys(photos).length} photos in lib/stock-photos.ts`);
