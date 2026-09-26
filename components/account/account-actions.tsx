'use client';

import { LoaderCircle, LogOut, Trash2 } from 'lucide-react';
import { useState } from 'react';

async function send(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: { code: string; message: string } };
  return { ok: response.ok, message: payload.error?.message, code: payload.error?.code };
}

export function NameForm({ initial, labels }: { initial: string; labels: { name: string; placeholder: string; save: string; saved: string; error: string } }) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={async (event) => {
        event.preventDefault();
        setState('saving');
        const result = await send('/api/v1/me', 'PATCH', { displayName: value });
        setState(result.ok ? 'saved' : 'error');
        setMessage(result.ok ? labels.saved : (result.message ?? labels.error));
      }}
    >
      <label className="flex-1">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{labels.name}</span>
        <input value={value} onChange={(event) => { setValue(event.target.value); setState('idle'); }} minLength={2} maxLength={60} required placeholder={labels.placeholder} className="h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-primary/25" />
      </label>
      <button disabled={state === 'saving' || value.trim() === initial} className="h-11 rounded-xl bg-navy px-5 text-sm font-bold text-white disabled:opacity-50">
        {state === 'saving' ? <LoaderCircle className="mx-auto size-4 animate-spin" aria-hidden /> : labels.save}
      </button>
      {message ? <output className={state === 'error' ? 'block text-sm font-semibold text-red-600 sm:ml-2' : 'block text-sm font-semibold text-emerald-700 sm:ml-2'}>{message}</output> : null}
    </form>
  );
}

export function LogoutButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await send('/api/v1/auth/logout', 'POST').catch(() => undefined);
        window.location.assign('/');
      }}
      className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-navy hover:border-primary/40 disabled:opacity-60"
    >
      <LogOut className="size-4" aria-hidden /> {label}
    </button>
  );
}

/** Deletes the account; the only owner of a business may close the business in the same step. */
export function DeleteAccountButton({ labels }: { labels: { button: string; ask: string; error: string; closeAndDelete: string; closeAsk: string } }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [soleOwner, setSoleOwner] = useState(false);
  async function remove(closeBusinesses: boolean) {
    if (!window.confirm(closeBusinesses ? labels.closeAsk : labels.ask)) return;
    setBusy(true);
    const result = await send('/api/v1/me', 'DELETE', closeBusinesses ? { closeBusinesses: true } : undefined);
    if (result.ok) {
      window.location.assign('/');
      return;
    }
    setBusy(false);
    setSoleOwner(result.code === 'SOLE_OWNER');
    setError(result.message ?? labels.error);
  }
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => remove(false)}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-red-50 px-4 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
      >
        <Trash2 className="size-4" aria-hidden /> {labels.button}
      </button>
      {error ? <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
      {soleOwner ? (
        <button type="button" disabled={busy} onClick={() => remove(true)} className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
          <Trash2 className="size-4" aria-hidden /> {labels.closeAndDelete}
        </button>
      ) : null}
    </div>
  );
}

export function CancelCodeButton({ redemptionId, labels }: { redemptionId: string; labels: { button: string; ask: string; error: string } }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm(labels.ask)) return;
        setBusy(true);
        const result = await send(`/api/v1/redemptions/${encodeURIComponent(redemptionId)}/cancel`, 'POST');
        if (!result.ok) window.alert(result.message ?? labels.error);
        window.location.reload();
      }}
      className="text-sm font-bold text-slate-500 underline-offset-4 hover:text-red-600 hover:underline disabled:opacity-60"
    >
      {labels.button}
    </button>
  );
}
