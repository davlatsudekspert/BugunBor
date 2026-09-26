#!/usr/bin/env node
// Imports photos from a local folder (e.g. the Google Drive folder "BugunBor
// rasmlar") as demo photos: public/photos/<key>.webp + .sm.webp and
// lib/stock-photos.ts. File names are visual keys or their Uzbek names, with an
// optional variant number: plov.jpg, osh-2.jpg, lagmon.jpg, somsa.jpg, kofe.jpg…
//
// Authors and licences come from mualliflar.csv in the same folder
// (fayl,muallif,litsenziya,manba_url); files without a row use --author and
// --license (default: the business's own photo).
//
//   node scripts/import-photos.mjs ~/Downloads/bugunbor
//   node scripts/import-photos.mjs ~/Downloads/own --author "BugunBor" --license "Own photo"

import { readdir, readFile } from 'node:fs/promises';
import { extname, basename, join } from 'node:path';

import { MILITARY, writePhoto, writePhotos } from './fetch-stock-photos.mjs';

const ROOT = new URL('..', import.meta.url).pathname;

const ALIASES = {
  osh: 'plov', palov: 'plov', lagmon: 'noodles', lagman: 'noodles', norin: 'noodles', kabob: 'shashlik', gosht: 'meat',
  manti: 'dumplings', chuchvara: 'dumplings', somsa: 'samsa', non: 'bread', shorva: 'soup', mastava: 'soup', tovuq: 'chicken',
  lanch: 'lunch', pitsa: 'pizza', lavash: 'wrap', salat: 'salad', kofe: 'coffee', nonushta: 'breakfast', choy: 'tea',
  tort: 'cake', desert: 'dessert', muzqaymoq: 'icecream', holva: 'sweets', halva: 'sweets', navvot: 'sweets', bozor: 'shopping',
  xarid: 'shopping', kiyim: 'clothes', krossovka: 'sneakers', ryukzak: 'backpack', kitoblar: 'books', kitob: 'books', sovga: 'gift',
  quruqmeva: 'nuts', yongoq: 'nuts', idish: 'kitchen', kastryulka: 'kitchen', gul: 'flowers', gullar: 'flowers', telefon: 'phone',
  sopol: 'crafts', atlas: 'fabric', adras: 'fabric', sozana: 'suzani', suzana: 'suzani', doppi: 'doppi', oymakor: 'woodcarving',
  qogirchoq: 'doll', manikyur: 'beauty', kiprik: 'makeup', qosh: 'makeup', soch: 'hair', sartarosh: 'barber', massaj: 'spa', yuz: 'facial', kosmetolog: 'facial',
  fitnes: 'fitness', basseyn: 'pool', futbol: 'football', boks: 'boxing', kino: 'cinema', bouling: 'bowling', kvest: 'quest',
  bolalar: 'kids', batut: 'kids', oyin: 'game', bilyard: 'billiards', teatr: 'theater', ot: 'horse', avtoyuvish: 'car',
  mashina: 'car', shina: 'tires', kimyoviy: 'laundry', tamir: 'repair', konditsioner: 'repair', noutbuk: 'laptop', poyabzal: 'shoes',
  tikuv: 'sewing', tozalash: 'cleaning', foto: 'camera', talim: 'education', kompyuter: 'computer', yetkazish: 'delivery',
  meva: 'fruit', suv: 'water',
};

const LICENSE_URLS = [
  [/^cc0/i, 'https://creativecommons.org/publicdomain/zero/1.0/'],
  [/^cc by-sa (\d\.\d)/i, (m) => `https://creativecommons.org/licenses/by-sa/${m[1]}/`],
  [/^cc by (\d\.\d)/i, (m) => `https://creativecommons.org/licenses/by/${m[1]}/`],
  [/^(public domain|pd)/i, 'https://commons.wikimedia.org/wiki/Commons:Public_domain'],
  [/unsplash/i, 'https://unsplash.com/license'],
  [/pexels/i, 'https://www.pexels.com/license/'],
  [/^own photo/i, '/terms'],
];

function licenseUrl(license) {
  if (/\b(nc|nd)\b|non-?commercial|no-?deriv/i.test(license)) return null;
  for (const [pattern, url] of LICENSE_URLS) {
    const match = license.match(pattern);
    if (match) return typeof url === 'function' ? url(match) : url;
  }
  return null;
}

/** Minimal CSV: comma separated, fields may be quoted. */
function parseCsv(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/).filter((row) => row.trim())) {
    const cells = [];
    let cell = '';
    let quoted = false;
    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      if (quoted && char === '"' && line[index + 1] === '"') { cell += '"'; index++; }
      else if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) { cells.push(cell.trim()); cell = ''; }
      else cell += char;
    }
    cells.push(cell.trim());
    rows.push(cells);
  }
  return rows;
}

const args = process.argv.slice(2);
const folder = args.find((arg, index) => !arg.startsWith('--') && !args[index - 1]?.startsWith('--'));
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
if (!folder) {
  console.error('Usage: node scripts/import-photos.mjs <folder> [--author "Name"] [--license "Own photo"]');
  process.exit(1);
}

const visuals = new Set([...(await readFile(`${ROOT}lib/visuals.ts`, 'utf8')).matchAll(/^ {2}(\w+): \{ emoji/gm)].map((match) => match[1]));
const source = await readFile(`${ROOT}lib/stock-photos.ts`, 'utf8');
const photos = JSON.parse(source.match(/STOCK_PHOTOS: Record<string, StockPhoto> = (\{[\s\S]*\});/)?.[1] ?? '{}');

const files = await readdir(folder);
const credits = new Map();
const csvFile = files.find((file) => /^(mualliflar|credits)\.csv$/i.test(file));
if (csvFile) {
  for (const [file, author, license, url] of parseCsv(await readFile(join(folder, csvFile), 'utf8'))) {
    if (file && !/^fayl$|^file$/i.test(file)) credits.set(file.toLowerCase(), { author, license, url });
  }
}

for (const file of files) {
  if (!/\.(jpe?g|png|webp|heic)$/i.test(file)) continue;
  const [, name = '', variant] = basename(file, extname(file)).toLowerCase().match(/^(.*?)(?:-(\d+))?$/) ?? [];
  const visual = ALIASES[name.replace(/[^a-z]/g, '')] ?? name.replace(/[^a-z]/g, '');
  if (!visuals.has(visual)) {
    console.warn(`✗ ${file}: unknown visual "${visual}"`);
    continue;
  }
  const key = variant && variant !== '1' ? `${visual}-${variant}` : visual;
  const credit = credits.get(file.toLowerCase()) ?? { author: option('author', 'BugunBor'), license: option('license', 'Own photo'), url: '/credits' };
  if (MILITARY.test(`${file} ${credit.url} ${credit.author}`)) {
    console.warn(`✗ ${file}: military subject, not allowed`);
    continue;
  }
  const url = licenseUrl(credit.license);
  if (!url) {
    console.warn(`✗ ${file}: licence "${credit.license}" does not allow commercial use or is unknown`);
    continue;
  }
  try {
    const bytes = await writePhoto(key, await readFile(join(folder, file)));
    photos[key] = { src: `/photos/${key}.webp`, title: basename(file, extname(file)), author: credit.author || 'BugunBor', license: credit.license, licenseUrl: url, source: credit.url || '/credits' };
    console.log(`✓ ${file} → ${key} (${Math.round(bytes / 1024)} KB)`);
  } catch (error) {
    console.warn(`✗ ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

await writePhotos(photos);
console.log(`\n${Object.keys(photos).length} photos in lib/stock-photos.ts`);
