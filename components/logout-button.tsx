'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, LogOut } from 'lucide-react';

/**
 * The one real way a customer/business session ever ends. Before this existed, /account's
 * "Chiqish" was a plain `<a href="/login">` — it navigated away but never called this route,
 * so the __Host-bugunbor_session cookie (30 days) stayed valid and the account was still
 * logged in on the next visit, exactly like modules/admin's AdminLogoutButton already does
 * correctly for /admin. POST /api/v1/auth/logout revokes the session server-side (see
 * modules/auth/otp.ts's revokeSessionToken) and clears the cookie; router.refresh() re-runs
 * every server component on the current tree so a stale "logged in" render can't linger.
 */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      router.push('/');
      router.refresh();
    }
  }

  return (
    <button type="button" onClick={logout} disabled={busy} className={className ?? 'flex items-center gap-2 text-sm font-bold text-slate-500 disabled:opacity-60'}>
      {busy ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />} Chiqish
    </button>
  );
}
