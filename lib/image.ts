// Deal cover photos are stored inline in D1 as a compressed JPEG data URL — there is no
// S3/R2 object store wired up for this app (see db/runtime.ts's `deals.image_url` column) —
// so keeping the encoded payload small matters far more here than for a normal upload.
const MAX_DIMENSION_PX = 1280;
const JPEG_QUALITY = 0.75;
const FALLBACK_DIMENSION_PX = 800;
const FALLBACK_JPEG_QUALITY = 0.5;
/** ~650KB of raw image data once decoded — comfortably under D1's per-row size limit even
 * with the ~33% overhead base64 encoding adds, while still looking sharp on a phone screen. */
export const MAX_COVER_IMAGE_DATA_URL_LENGTH = 900_000;

function readAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawToJpegDataUrl(image: HTMLImageElement, maxDimension: number, quality: number): string | null {
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Downscales a picked image file client-side into a JPEG data URL small enough to store
 * inline — a phone camera photo is routinely 3-8MB, which would blow well past what a D1 row
 * can hold. Tries a normal-quality pass first; if the visitor's photo is unusually large or
 * detailed and that still doesn't fit under the cap, retries once at a smaller size before
 * giving up. Returns null if the file isn't a decodable image, or still doesn't fit.
 */
export async function compressImageToDataUrl(file: File): Promise<string | null> {
  const dataUrl = await readAsDataUrl(file);
  if (!dataUrl) return null;
  const image = await loadImage(dataUrl);
  if (!image) return null;

  const first = drawToJpegDataUrl(image, MAX_DIMENSION_PX, JPEG_QUALITY);
  if (first && first.length <= MAX_COVER_IMAGE_DATA_URL_LENGTH) return first;

  const second = drawToJpegDataUrl(image, FALLBACK_DIMENSION_PX, FALLBACK_JPEG_QUALITY);
  if (second && second.length <= MAX_COVER_IMAGE_DATA_URL_LENGTH) return second;

  return null;
}
