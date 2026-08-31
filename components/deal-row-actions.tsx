'use client';

import { useState } from 'react';
import { LoaderCircle, Trash2, XCircle } from 'lucide-react';

export function DealRowActions({ id, status }: { id: string; status: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>(
    'idle',
  );
  const [message, setMessage] = useState('');

  async function act(action: 'stop' | 'delete') {
    setState('loading');
    setMessage('');
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (window.location.hostname === 'localhost')
      headers['x-bugunbor-demo-user'] = 'usr_owner_browser';
    const response = await fetch(
      action === 'stop' ? `/api/v1/deals/${id}/stop` : `/api/v1/deals/${id}`,
      {
        method: action === 'stop' ? 'POST' : 'DELETE',
        headers,
      },
    );
    const result = (await response.json()) as { error?: { message: string } };
    if (!response.ok) {
      setState('error');
      setMessage(result.error?.message ?? 'Amal bajarilmadi.');
      return;
    }
    setState('done');
  }

  if (state === 'done')
    return (
      <span className="text-xs font-bold text-emerald-700">Bajarildi</span>
    );

  const canStop = status === 'ACTIVE';
  const canDelete =
    status === 'DRAFT' || status === 'PENDING_REVIEW' || status === 'SCHEDULED';
  if (!canStop && !canDelete)
    return <span className="text-xs text-slate-400">—</span>;

  return (
    <div className="flex items-center gap-2">
      {canStop ? (
        <button
          onClick={() => act('stop')}
          disabled={state === 'loading'}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:border-red-200 hover:text-red-700 disabled:opacity-50"
        >
          {state === 'loading' ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <XCircle className="size-3.5" />
          )}{' '}
          To‘xtatish
        </button>
      ) : null}
      {canDelete ? (
        <button
          onClick={() => act('delete')}
          disabled={state === 'loading'}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:border-red-200 hover:text-red-700 disabled:opacity-50"
        >
          {state === 'loading' ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}{' '}
          O‘chirish
        </button>
      ) : null}
      {state === 'error' ? (
        <span className="text-xs font-semibold text-red-600">{message}</span>
      ) : null}
    </div>
  );
}
