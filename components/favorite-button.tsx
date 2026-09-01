'use client';

import { useState } from 'react';
import { Heart, LoaderCircle } from 'lucide-react';

export function FavoriteButton({ dealId, dealSlug, initialFavorited, isAuthenticated }: { dealId: string; dealSlug: string; initialFavorited: boolean; isAuthenticated: boolean }) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) {
    return (
      <a href={`/login?returnTo=${encodeURIComponent(`/deals/${dealSlug}`)}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#152a3b] transition hover:border-primary hover:text-primary">
        <Heart className="size-4" /> Saqlash
      </a>
    );
  }

  async function toggle() {
    setLoading(true);
    try {
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (window.location.hostname === 'localhost') headers['x-bugunbor-demo-user'] = 'usr_customer_browser';
      const response = await fetch('/api/v1/favorites', { method: 'POST', headers, body: JSON.stringify({ dealId }) });
      const result = (await response.json()) as { data?: { favorited: boolean } };
      if (response.ok && result.data) setFavorited(result.data.favorited);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-pressed={favorited}
      className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition disabled:opacity-60 ${favorited ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 bg-white text-[#152a3b] hover:border-primary hover:text-primary'}`}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Heart className={favorited ? 'size-4 fill-primary' : 'size-4'} />}
      {favorited ? 'Saqlangan' : 'Saqlash'}
    </button>
  );
}
