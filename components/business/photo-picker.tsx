'use client';

import { ImagePlus, LoaderCircle, RefreshCw, Trash2 } from 'lucide-react';
import { useId, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export type PhotoLabels = {
  choose: string; change: string; remove: string; processing: string; uploading: string; failed: string; tooBig: string; networkError: string;
};

type Kind = 'DEAL' | 'LOGO' | 'COVER';

export const MAX_INPUT_BYTES = 30 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 650_000;
const MAX_SIDE: Record<Kind, number> = { DEAL: 1280, COVER: 1600, LOGO: 512 };

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    image.src = url;
  });
}

/** Resizes on the phone and re-encodes to WebP (JPEG where WebP encoding is missing). */
export async function compress(file: File, maxSide: number, maxBytes = MAX_UPLOAD_BYTES): Promise<Blob> {
  const image = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas');
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const encode = (type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  let type = 'image/webp';
  let blob = await encode(type, 0.82);
  if (!blob || blob.type !== 'image/webp') {
    type = 'image/jpeg';
    blob = await encode(type, 0.85);
  }
  for (let quality = 0.7; blob && blob.size > maxBytes && quality >= 0.4; quality -= 0.1) {
    blob = await encode(type, quality);
  }
  if (!blob || blob.size > maxBytes) throw new Error('encode');
  return blob;
}

/** Picks, compresses and uploads one photo; reports the stored media id. */
export function PhotoPicker({ businessId, kind, value, onChange, label, hint, labels, className }: {
  businessId: string;
  kind: Kind;
  value: string | null;
  onChange: (id: string | null) => void;
  label: string;
  hint?: string;
  labels: PhotoLabels;
  className?: string;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<'idle' | 'processing' | 'uploading'>('idle');
  const [error, setError] = useState('');

  async function upload(file: File) {
    setError('');
    if (file.size > MAX_INPUT_BYTES) {
      setError(labels.tooBig);
      return;
    }
    setPhase('processing');
    let blob: Blob;
    try {
      blob = await compress(file, MAX_SIDE[kind]);
    } catch {
      setPhase('idle');
      setError(labels.failed);
      return;
    }
    setPhase('uploading');
    const form = new FormData();
    form.set('kind', kind);
    form.set('file', blob, blob.type === 'image/webp' ? 'photo.webp' : 'photo.jpg');
    try {
      const response = await fetch(`/api/v1/business/${businessId}/media`, { method: 'POST', body: form });
      const payload = (await response.json().catch(() => ({}))) as { data?: { id: string }; error?: { message: string } };
      if (!response.ok || !payload.data) {
        setError(payload.error?.message ?? labels.failed);
        return;
      }
      onChange(payload.data.id);
    } catch {
      setError(labels.networkError);
    } finally {
      setPhase('idle');
    }
  }

  const busy = phase !== 'idle';
  const square = kind === 'LOGO';

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-bold text-navy">{label}</label>
      <div className={cn('relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50', square ? 'size-32' : 'aspect-[4/3] w-full max-w-sm', value && 'border-solid border-slate-200')}>
        {value ? <img src={`/media/${value}`} alt="" className="absolute inset-0 size-full object-cover" /> : null}
        {busy ? (
          <div className="absolute inset-0 grid place-items-center bg-white/80 text-center text-xs font-bold text-navy">
            <span className="flex flex-col items-center gap-2"><LoaderCircle className="size-6 animate-spin text-primary" aria-hidden />{phase === 'processing' ? labels.processing : labels.uploading}</span>
          </div>
        ) : !value ? (
          <button type="button" onClick={() => input.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm font-bold text-slate-500 transition hover:bg-primary/5 hover:text-primary">
            <ImagePlus className="size-7" aria-hidden />
            {labels.choose}
          </button>
        ) : null}
      </div>
      <input
        ref={input}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void upload(file);
        }}
      />
      {value && !busy ? (
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => input.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-navy hover:border-primary/40"><RefreshCw className="size-3.5" aria-hidden /> {labels.change}</button>
          <button type="button" onClick={() => onChange(null)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-red-600 hover:border-red-300"><Trash2 className="size-3.5" aria-hidden /> {labels.remove}</button>
        </div>
      ) : null}
      {error ? <p role="alert" className="mt-1.5 text-xs font-semibold text-red-600">{error}</p> : hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
