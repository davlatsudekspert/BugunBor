import { describe, expect, it } from 'vitest';

import { NOW, marketplace } from '@/test/fixtures';
import { updateBusinessProfile } from '@/modules/businesses/service';
import { assertOwnMedia, base64ToBytes, bytesToBase64, detectImageType, getMedia, imageSize, pruneOrphanMediaStatement, saveMedia } from './service';

const errorCode = async (promise: Promise<unknown>) => promise.then(() => 'OK', (error: { code?: string; message?: string }) => error.code ?? error.message ?? 'UNKNOWN');

function png(width: number, height: number) {
  const bytes = new Uint8Array(64);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function jpeg(width: number, height: number) {
  const bytes = new Uint8Array(64);
  // SOI, an APP0 segment of 16 bytes, then SOF0 with height and width.
  bytes.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const sof = 2 + 2 + 16;
  bytes.set([0xff, 0xc0, 0x00, 0x11, 0x08], sof);
  const view = new DataView(bytes.buffer);
  view.setUint16(sof + 5, height);
  view.setUint16(sof + 7, width);
  return bytes;
}

function webp(width: number, height: number) {
  const bytes = new Uint8Array(64);
  const text = (offset: number, value: string) => [...value].forEach((char, index) => { bytes[offset + index] = char.charCodeAt(0); });
  text(0, 'RIFF');
  text(8, 'WEBP');
  text(12, 'VP8X');
  const uint24 = (offset: number, value: number) => bytes.set([value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff], offset);
  uint24(24, width - 1);
  uint24(27, height - 1);
  return bytes;
}

describe('image validation', () => {
  it('detects formats by their bytes, not by name', () => {
    expect(detectImageType(png(10, 10))).toBe('image/png');
    expect(detectImageType(jpeg(10, 10))).toBe('image/jpeg');
    expect(detectImageType(webp(10, 10))).toBe('image/webp');
    expect(detectImageType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(detectImageType(new TextEncoder().encode('GIF89a'))).toBeNull();
  });

  it('reads pixel sizes from headers', () => {
    expect(imageSize(png(800, 600), 'image/png')).toEqual({ width: 800, height: 600 });
    expect(imageSize(jpeg(1280, 960), 'image/jpeg')).toEqual({ width: 1280, height: 960 });
    expect(imageSize(webp(1024, 768), 'image/webp')).toEqual({ width: 1024, height: 768 });
  });

  it('round-trips base64', () => {
    const bytes = new Uint8Array(100_000).map((_, index) => (index * 31) % 256);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });
});

describe('saving media', () => {
  it('stores a valid image and serves it back', async () => {
    const db = await marketplace();
    const saved = await saveMedia(db, { businessId: 'biz', userId: 'owner', kind: 'DEAL', bytes: webp(1280, 960) }, NOW);
    expect(saved.url).toBe(`/media/${saved.id}`);
    const media = await getMedia(db, saved.id);
    expect(media?.mime).toBe('image/webp');
    expect(media?.bytes).toEqual(webp(1280, 960));
    expect(await getMedia(db, 'not-a-uuid')).toBeNull();
  });

  it('rejects fakes, huge and tiny images', async () => {
    const db = await marketplace();
    const save = (bytes: Uint8Array<ArrayBuffer>) => errorCode(saveMedia(db, { businessId: 'biz', userId: 'owner', kind: 'DEAL', bytes }, NOW));
    expect(await save(new TextEncoder().encode('<script>alert(1)</script>'))).toBe('IMAGE_INVALID');
    expect(await save(png(10_000, 10_000))).toBe('IMAGE_INVALID');
    expect(await save(png(20, 20))).toBe('IMAGE_INVALID');
    expect(await save(new Uint8Array(800_000))).toBe('IMAGE_TOO_LARGE');
  });

  it('only lets a business use its own uploads', async () => {
    const db = await marketplace();
    const mine = await saveMedia(db, { businessId: 'biz', userId: 'owner', kind: 'LOGO', bytes: png(512, 512) }, NOW);
    const theirs = await saveMedia(db, { businessId: 'other', userId: 'owner', kind: 'LOGO', bytes: png(512, 512) }, NOW);
    expect(await errorCode(assertOwnMedia(db, 'biz', mine.id))).toBe('OK');
    expect(await errorCode(assertOwnMedia(db, 'biz', theirs.id))).toBe('VALIDATION');
    const profile = { name: 'Kafe', description: 'Yaxshi kafe, har kuni yangi taomlar bilan.', categoryId: 'cat_food', city: 'tashkent' as const, phone: '+998712000000' };
    expect(await errorCode(updateBusinessProfile(db, { businessId: 'biz', userId: 'owner', resubmit: false, data: { ...profile, logoId: theirs.id } }, NOW))).toBe('VALIDATION');
    await updateBusinessProfile(db, { businessId: 'biz', userId: 'owner', resubmit: false, data: { ...profile, logoId: mine.id } }, NOW);
    expect(await db.prepare(`SELECT logo_id FROM businesses WHERE id = 'biz'`).first('logo_id')).toBe(mine.id);
  });

  it('removes uploads nobody used after a day', async () => {
    const db = await marketplace();
    const used = await saveMedia(db, { businessId: 'biz', userId: 'owner', kind: 'DEAL', bytes: webp(800, 600) }, NOW);
    const orphan = await saveMedia(db, { businessId: 'biz', userId: 'owner', kind: 'DEAL', bytes: webp(800, 600) }, NOW);
    await db.prepare(`UPDATE deals SET photo_id = ?1 WHERE id = 'deal'`).bind(used.id).run();
    await pruneOrphanMediaStatement(db, new Date(NOW.getTime() + 2 * 24 * 60 * 60_000)).run();
    expect(await getMedia(db, used.id)).not.toBeNull();
    expect(await getMedia(db, orphan.id)).toBeNull();
  });
});
