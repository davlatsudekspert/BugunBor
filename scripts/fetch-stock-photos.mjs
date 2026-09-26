#!/usr/bin/env node
// Downloads the curated, freely licensed ORIGINAL photos (real photographs,
// never AI or illustrations) from Wikimedia Commons for the demo catalogue:
// public/photos/<key>.webp (1200×900), <key>.sm.webp (720×540) and
// lib/stock-photos.ts with author and licence. They are shown only on demo
// deals; /credits lists the authors.
//
//   node scripts/fetch-stock-photos.mjs              # every curated photo
//   node scripts/fetch-stock-photos.mjs plov samsa-2 # only these keys
//   node scripts/fetch-stock-photos.mjs --search "Uzbek plov"  # find candidates
//
// Keys are deal visuals (lib/visuals.ts); "plov-2", "plov-3" are extra
// variants, spread over demo deals so the catalogue does not repeat one photo.
// Every pick was reviewed by eye: real photo, no readable brand, no close-up
// faces and nothing military (weapons, uniforms, vehicles). Photos imported with import-photos.mjs stay unless their key is named.
// Needs network access to commons.wikimedia.org and upload.wikimedia.org.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const sharp = createRequire(import.meta.url)('sharp');
const ROOT = new URL('..', import.meta.url).pathname;
const API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'BugunBor/1.0 (https://bugunbor.uz; demo catalogue photos)';
export const SIZES = { large: [1200, 900], small: [720, 540] };

/** Commons file per key; `crop` = [left, top, width, height] as fractions, to leave out a sign or a logo. */
const CURATED = {
  // Food
  plov: 'Plov with lamb and carrots in ceramic bowl.jpg',
  'plov-2': 'Urazmat-Plov.jpg',
  'plov-3': 'Uzbekistan style plov in Japan.jpg',
  noodles: 'Uzbek lagman.jpg',
  shashlik: 'Shashlik-national food of Uzbekistan.jpg',
  meat: 'Qozon kabob (Uzbek national cuisine).jpg',
  dumplings: 'Uzbek Manti (bright).jpg',
  samsa: 'Uzbek samsa in Vienna, Austria.jpg',
  'samsa-2': 'Samsa of Khiva.jpg',
  'samsa-3': "'Parmuda'-uzbek samsa-02.jpg",
  bread: { file: 'Uzbekistan lives of citizens IGP3003.jpg', crop: [0, 0.12, 1, 0.5] },
  soup: 'Суп Мастава.jpg',
  chicken: 'Chicken Tandoori 01.jpg',
  'chicken-2': 'Tandoori Chicken Home Made.JPG',
  lunch: 'EM Main course (3627263529).jpg',
  'lunch-2': 'Buffet lunch at restaurant Sapusca in December 2023.jpg',
  burger: 'Homemade hamburger with french fries in Argentina.jpg',
  pizza: 'Margherita Originale.JPG',
  wrap: 'Shawarma Sandwich.jpg',
  sushi: "Sushi at Luckiefun's in November 2023.jpg",
  // Cafés and sweets
  coffee: 'Classical Cappuccino in Savour Cafe.jpg',
  'coffee-2': 'A-cup-of-cappuccino-coffee-dar-es-salaam-cafe.jpg',
  breakfast: 'Omelette 20210505 075028.jpg',
  tea: 'Uzbek tea couple with traditional coloration.jpg',
  cake: 'Piece of chocolate cake on a white plate decorated with chocolate sauce.jpg',
  dessert: 'Cheshire cupcakes.jpg',
  icecream: 'Ice Cream Trio @ Maid of Auckland Hotel, Edwardstown 20250314-124805.jpg',
  sweets: 'Люблю сладости это элемент гостеприимства.jpg',
  // Shopping and crafts
  shopping: 'Siyob Bazaar in Samarkand 3.jpg',
  clothes: 'Interior sports clothing store Cala Millor.jpg',
  sneakers: 'Converse Jack Purcell sneakers on white canvas.jpg',
  backpack: { file: 'Boy-in-brown-hoodie-carrying-red-backpack-while-walking-on-207697.jpg', crop: [0, 0.34, 1, 0.5] },
  books: 'Bookstore shelves.jpg',
  gift: 'Brown gift box with red ribbon and bow.jpg',
  nuts: 'Mercado de Chorsu 05.jpg',
  'nuts-2': 'Samarcanda, Siyab 5.jpg',
  kitchen: 'Saucepan.jpg',
  flowers: 'Bouquet de roses roses.jpg',
  phone: 'Smartphone with case cover on table.jpg',
  crafts: 'Piyola-choynak 1.jpg',
  fabric: 'Adras (Ikat). 1990s. Silk, cotton.jpg',
  'fabric-2': 'Adras (Ikat). 1990s. Silk, cotton (3).jpg',
  suzani: 'Boukhara-Suzani (2).jpg',
  doppi: 'Tajik Tubeteika-2.jpg',
  woodcarving: 'Djouma mosque column detail 2.JPG',
  'woodcarving-2': 'Artisanat et tourisme (Khiva, Ouzbékistan) (5606264361).jpg',
  doll: '224 Molí paperer Meros (Konigil, Samarcanda), ninos.jpg',
  // Beauty
  beauty: 'French Manicure with Glitter nail art on ring finger.jpg',
  makeup: '2012-11-19 Eyelash extensions at the Shilin Night Market.jpg',
  hair: 'Cutting hair - haircuts.jpg',
  barber: 'Barbershop in Cancun.jpg',
  spa: 'Ostentrop Germany Chanchai-Thaimassage-10.jpg',
  'spa-2': 'YHI Spa treatment room at Paradisus by Meliá Bali.jpg',
  facial: 'Routine Facial Treatment And Care.jpg',
  // Sport
  fitness: 'Colorful pile of dumbbells at the gym 2.jpg',
  pool: 'Swimming Pool lanes and starting blocks.jpg',
  yoga: 'Girl doing bird dog yoga pose 2.jpg',
  football: 'Futsal indoor.jpg',
  boxing: 'Boxing gloves Bail 10-OZ (4).jpg',
  kurash: 'Tournoi de Kurash 27.jpg',
  tennis: 'Pörtschach Johannes-Brahms-Promenade Werzer-Tennis-Arena 27052017 8932.jpg',
  // Entertainment
  fun: 'Illuminated Ferris wheel, bouncing castle and carousel at night in a funfair in Vientiane, Laos.jpg',
  cinema: 'Columbia City Cinema main hall.jpg',
  bowling: { file: 'Bowland Elizabeth, Edinburgh North 20251209-093756.jpg', crop: [0.2, 0.12, 0.8, 0.8] },
  quest: 'Escape Room - "The Expedition" (Escape Quest Bethesda).jpg',
  kids: 'Ball pit with playground slide.jpg',
  karaoke: 'Karaoke in Nha Trang.jpg',
  game: 'KontrolerDualSense.jpg',
  billiards: 'Billiards table 2.JPG',
  theater: 'Küçük Tiyatro.jpg',
  horse: 'Horseback Riding on Limberlost Trail (51832760724).jpg',
  // Services
  car: '2015 Kłodzko, ul. Dusznicka, myjnia samochodowa 02.jpg',
  tires: 'Tire Changer.jpg',
  laundry: 'Dry cleaned clothes (Unsplash).jpg',
  repair: 'Modern split-type air conditioner at a school.jpg',
  laptop: 'Thermal CompoundApplying.JPG',
  shoes: 'Swanson Shoe Repair 04A.jpg',
  sewing: 'Woman sewing a face mask with a Singer machine 14.jpg',
  cleaning: 'Spray cleaner.jpg',
  camera: '2018-Pulitzer-Prizes-photo-studio.jpg',
  education: 'Classroom in Foreign Languages Building - Tunghai University- DSC01517.JPG',
  computer: 'Computer Lab Baraboo.jpg',
  // Delivery
  delivery: 'Food delivery by scooter in France (1).jpg',
  fruit: 'A basket of fruits.jpg',
  water: { file: 'Water bottles in yuen long.jpg', crop: [0.15, 0.2, 0.85, 0.8] },
};

// Commercial use and modification allowed; attribution handled on /credits.
const ALLOWED = /^(cc0|public domain|pd|cc by(-sa)? (2\.0|2\.5|3\.0|4\.0))/i;

// Nothing military on BugunBor: such files are left out of searches and imports.
export const MILITARY = /military|army|soldier|troop|airm[ae]n|air force|marines?\b|navy|naval|DVIDS|weapon|rifle|pistol|\bguns?\b|tank|armou?r|combat|war\b/i;

const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** A short author name: the first line of the Artist field, a linked user name, or the uploader. */
function authorName(html = '', uploader = '') {
  const clean = (text) => text.replace(/\s*-\s*Wikimedia Commons.*$/i, '').replace(/\(Want to use this image\?\)/i, '').trim();
  const first = clean(strip(html.split(/<br\s*\/?>|<\/p>|<\/div>|\n/i)[0]));
  if (first && first.length <= 60) return first;
  const linked = clean(strip(html.match(/<a[^>]*href="[^"]*\/wiki\/User:[^"]*"[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? ''));
  if (linked && linked.length <= 60) return linked;
  return uploader || 'Wikimedia Commons';
}

async function request(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, { headers: { 'user-agent': USER_AGENT } }).catch(() => null);
    if (response?.ok) return response;
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
  }
  throw new Error(`request failed: ${url}`);
}

async function imageInfo(params) {
  const query = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', prop: 'imageinfo', iiprop: 'url|size|mime|user|extmetadata',
    iiurlwidth: '1600', iiextmetadatafilter: 'LicenseShortName|Artist|LicenseUrl|Credit|ImageDescription', ...params,
  });
  const data = await (await request(`${API}?${query}`)).json();
  return data.query?.pages ?? [];
}

function describe(page) {
  const info = page.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  const license = strip(meta.LicenseShortName?.value);
  return {
    title: page.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''),
    author: authorName(meta.Artist?.value, info.user),
    license,
    licenseUrl: meta.LicenseUrl?.value ?? 'https://commons.wikimedia.org/wiki/Commons:Licensing',
    source: info.descriptionurl,
    allowed: ALLOWED.test(license) && !/nc|nd/i.test(license),
    military: MILITARY.test([page.title, strip(meta.Artist?.value), strip(meta.Credit?.value), strip(meta.ImageDescription?.value)].join(' ')),
    url: info.thumburl ?? info.url,
    width: info.width,
    height: info.height,
    mime: info.mime,
  };
}

/** Writes <key>.webp and <key>.sm.webp from any image buffer. Shared with import-photos.mjs. */
export async function writePhoto(key, input, crop) {
  let base = await sharp(input).rotate().jpeg({ quality: 95 }).toBuffer();
  if (crop) {
    const { width = 0, height = 0 } = await sharp(base).metadata();
    const [left, top, w, h] = crop;
    const x = Math.floor(left * width);
    const y = Math.floor(top * height);
    base = await sharp(base).extract({ left: x, top: y, width: Math.min(width - x, Math.round(w * width)), height: Math.min(height - y, Math.round(h * height)) }).jpeg({ quality: 95 }).toBuffer();
  }
  const large = await sharp(base).resize(...SIZES.large, { fit: 'cover', position: 'attention' }).webp({ quality: 76 }).toBuffer();
  const small = await sharp(base).resize(...SIZES.small, { fit: 'cover', position: 'attention' }).webp({ quality: 72 }).toBuffer();
  await writeFile(`${ROOT}public/photos/${key}.webp`, large);
  await writeFile(`${ROOT}public/photos/${key}.sm.webp`, small);
  return large.length + small.length;
}

async function readPhotos() {
  try {
    const source = await readFile(`${ROOT}lib/stock-photos.ts`, 'utf8');
    return JSON.parse(source.match(/STOCK_PHOTOS: Record<string, StockPhoto> = (\{[\s\S]*\});/)?.[1] ?? '{}');
  } catch {
    return {};
  }
}

export async function writePhotos(photos) {
  const header = `// Generated by scripts/fetch-stock-photos.mjs and scripts/import-photos.mjs:
// freely licensed original photos keyed by deal visual ("plov-2" is a second
// photo of plov), shown only on demo deals. /credits lists the authors.
// Regenerate with the scripts instead of editing by hand.

export type StockPhoto = { src: string; title: string; author: string; license: string; licenseUrl: string; source: string };

`;
  const sorted = Object.fromEntries(Object.entries(photos).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true })));
  await writeFile(`${ROOT}lib/stock-photos.ts`, `${header}export const STOCK_PHOTOS: Record<string, StockPhoto> = ${JSON.stringify(sorted, null, 2)};\n`);
}

async function searchCandidates(query) {
  const pages = await imageInfo({ generator: 'search', gsrnamespace: '6', gsrlimit: '30', gsrsearch: `${query} filetype:bitmap` });
  for (const page of pages.sort((a, b) => a.index - b.index)) {
    const photo = describe(page);
    if (!photo?.allowed || photo.mime !== 'image/jpeg' || photo.width < 1000 || photo.military) continue;
    console.log(`${photo.width}×${photo.height}  ${photo.license.padEnd(12)}  ${page.title.replace(/^File:/, '')}  — ${photo.author}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const reachable = await fetch(`${API}?action=query&meta=siteinfo&format=json`, { headers: { 'user-agent': USER_AGENT } }).then((response) => response.ok, () => false);
  if (!reachable) {
    console.error('commons.wikimedia.org is not reachable. Allow commons.wikimedia.org and upload.wikimedia.org in the network settings and run again.');
    process.exit(1);
  }
  if (args[0] === '--search') {
    await searchCandidates(args.slice(1).join(' '));
    return;
  }

  const keys = args.length ? args : Object.keys(CURATED);
  await mkdir(`${ROOT}public/photos`, { recursive: true });
  const photos = await readPhotos();
  for (const key of keys) {
    const pick = CURATED[key];
    if (!pick) {
      console.warn(`✗ ${key}: not in CURATED`);
      continue;
    }
    const { file, crop } = typeof pick === 'string' ? { file: pick, crop: undefined } : pick;
    // A photo imported with import-photos.mjs replaces the curated one until its key is fetched by name.
    if (!args.length && photos[key] && photos[key].title !== file.replace(/\.[a-z]+$/i, '')) {
      console.log(`• ${key}: keeps imported "${photos[key].title}"`);
      continue;
    }
    try {
      const [page] = await imageInfo({ titles: `File:${file}` });
      const photo = page && describe(page);
      if (!photo?.url) throw new Error('file not found');
      if (!photo.allowed) throw new Error(`licence not allowed: ${photo.license}`);
      if (photo.military) throw new Error('military subject, pick another photo');
      const bytes = await writePhoto(key, Buffer.from(await (await request(photo.url)).arrayBuffer()), crop);
      photos[key] = { src: `/photos/${key}.webp`, title: photo.title, author: photo.author, license: photo.license, licenseUrl: photo.licenseUrl, source: photo.source };
      console.log(`✓ ${key}: ${photo.title} — ${photo.author} (${photo.license}), ${Math.round(bytes / 1024)} KB`);
    } catch (error) {
      console.warn(`✗ ${key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  await writePhotos(photos);
  console.log(`\n${Object.keys(photos).length} photos in lib/stock-photos.ts`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
