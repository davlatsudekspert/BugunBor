'use client';

import { useState } from 'react';

type DemoUser = { id: string; name: string; role: string };

/** Development-only panel; the server route refuses these requests in production builds. */
export function DevLogin({ users, returnTo, title, text }: { users: DemoUser[]; returnTo: string; title: string; text: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  async function login(userId: string) {
    setBusy(userId);
    const response = await fetch('/api/v1/auth/dev-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, returnTo }),
    });
    const payload = (await response.json()) as { data?: { returnTo: string } };
    if (payload.data) window.location.assign(payload.data.returnTo);
    else setBusy(null);
  }
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5">
      <p className="text-sm font-black uppercase tracking-[.12em] text-amber-800">{title}</p>
      <p className="mt-1 text-sm text-amber-900">{text}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {users.map((user) => (
          <button key={user.id} type="button" data-testid={`dev-login-${user.id}`} onClick={() => login(user.id)} disabled={busy !== null} className="flex h-11 items-center justify-between rounded-xl bg-white px-4 text-left text-sm font-bold text-navy ring-1 ring-amber-200 transition hover:ring-amber-400 disabled:opacity-60">
            <span className="truncate">{user.name}</span>
            <span className="ml-2 shrink-0 text-xs font-semibold text-amber-700">{user.role}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
