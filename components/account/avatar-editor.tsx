'use client';

import { Camera, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, type ReactNode } from 'react';

import { MAX_INPUT_BYTES, compress } from '@/components/business/photo-picker';

type Labels = { add: string; change: string; remove: string; hint: string; failed: string; tooBig: string; networkError: string };

/** The person's own photo in the account header: pick, compress, upload or remove. Only they see it. */
export function AvatarEditor({ avatar, initials, labels, children }: { avatar: string | null; initials: string; labels: Labels; children: ReactNode }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState(avatar);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File) {
    setError('');
    if (file.size > MAX_INPUT_BYTES) return setError(labels.tooBig);
    setBusy(true);
    try {
      let blob: Blob;
      try {
        blob = await compress(file, 512, 280_000);
      } catch {
        return setError(labels.failed);
      }
      const form = new FormData();
      form.set('file', blob, blob.type === 'image/webp' ? 'avatar.webp' : 'avatar.jpg');
      const response = await fetch('/api/v1/me/avatar', { method: 'POST', body: form });
      const payload = (await response.json().catch(() => ({}))) as { data?: { avatar: string }; error?: { message: string } };
      if (!response.ok || !payload.data) return setError(payload.error?.message ?? labels.failed);
      setSrc(payload.data.avatar);
      router.refresh(); // the header shows the new photo too
    } catch {
      setError(labels.networkError);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/v1/me/avatar', { method: 'DELETE' });
      if (!response.ok) return setError(labels.failed);
      setSrc(null);
      router.refresh();
    } catch {
      setError(labels.networkError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button type="button" disabled={busy} onClick={() => input.current?.click()} aria-label={src ? labels.change : labels.add} className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        {src ? <img src={src} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-xl font-black text-white">{initials}</span>}
        <span className="absolute inset-x-0 bottom-0 grid h-6 place-items-center bg-navy/75 text-white">
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Camera className="size-4" aria-hidden />}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void upload(file);
        }}
      />
      <div className="min-w-0">
        {children}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold">
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="text-primary hover:underline disabled:opacity-50">{src ? labels.change : labels.add}</button>
          {src ? <button type="button" disabled={busy} onClick={() => void remove()} className="text-slate-500 hover:underline disabled:opacity-50">{labels.remove}</button> : null}
          <span className="text-xs font-semibold text-slate-400">{labels.hint}</span>
        </div>
        {error ? <p role="alert" className="mt-1 text-sm font-semibold text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
