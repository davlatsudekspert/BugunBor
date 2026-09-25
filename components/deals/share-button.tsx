'use client';

import { Share2 } from 'lucide-react';
import { useState } from 'react';

/** Native share sheet when available, otherwise copies the link. */
export function ShareButton({ url, text, labels }: { url: string; text: string; labels: { share: string; copied: string } }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const absolute = new URL(url, window.location.origin).toString();
    if (navigator.share) {
      await navigator.share({ title: text, text, url: absolute }).catch(() => undefined);
      return;
    }
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(absolute)}&text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    }
  }
  return (
    <button type="button" onClick={share} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-navy transition hover:border-primary/40">
      <Share2 className="size-4" aria-hidden /> {copied ? labels.copied : labels.share}
    </button>
  );
}
