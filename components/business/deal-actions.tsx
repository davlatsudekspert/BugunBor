'use client';

import { Copy, Crown, Eye, LoaderCircle, Pause, Pencil, Play, Send, Square, Trash2, Undo2 } from 'lucide-react';
import { useState } from 'react';

import { apiRequest } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type Labels = {
  edit: string; submit: string; withdraw: string; pause: string; resume: string; end: string; duplicate: string; delete: string; view: string;
  confirmEnd: string; confirmDelete: string; topOn: string; topOff: string; networkError: string;
};

type Props = {
  businessId: string;
  dealId: string;
  slug: string;
  status: string;
  isSponsored: boolean;
  labels: Labels;
};

const button = 'inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-navy transition hover:border-primary/40 disabled:opacity-50';

export function DealActions({ businessId, dealId, slug, status, isSponsored, labels }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function run(key: string, body: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(key);
    setError('');
    const result = await apiRequest<{ id?: string }>(`/api/v1/business/${businessId}`, body, { networkError: labels.networkError });
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (body.type === 'deal.duplicate' && result.data?.id) window.location.assign(`/business/deals/${result.data.id}`);
    else window.location.reload();
  }

  const transition = (action: string, confirmText?: string) => run(action, { type: 'deal.transition', dealId, action }, confirmText);
  const icon = (key: string, Icon: typeof Pencil) => (busy === key ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <Icon className="size-3.5" aria-hidden />);
  const editable = status === 'DRAFT' || status === 'REJECTED';
  const live = status === 'ACTIVE' || status === 'PAUSED';

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {editable ? <a href={`/business/deals/${dealId}`} className={button}><Pencil className="size-3.5" aria-hidden /> {labels.edit}</a> : null}
        {editable ? <button type="button" disabled={busy !== null} onClick={() => transition('submit')} className={cn(button, 'border-primary/40 text-primary')}>{icon('submit', Send)} {labels.submit}</button> : null}
        {status === 'PENDING_REVIEW' ? <button type="button" disabled={busy !== null} onClick={() => transition('withdraw')} className={button}>{icon('withdraw', Undo2)} {labels.withdraw}</button> : null}
        {status === 'ACTIVE' ? <button type="button" disabled={busy !== null} onClick={() => transition('pause')} className={button}>{icon('pause', Pause)} {labels.pause}</button> : null}
        {status === 'PAUSED' ? <button type="button" disabled={busy !== null} onClick={() => transition('resume')} className={button}>{icon('resume', Play)} {labels.resume}</button> : null}
        {live || status === 'PENDING_REVIEW' ? (
          <button type="button" disabled={busy !== null} onClick={() => run('top', { type: 'deal.top', dealId, on: !isSponsored })} className={cn(button, isSponsored && 'border-amber-300 bg-amber-50 text-amber-800')}>
            {icon('top', Crown)} {isSponsored ? labels.topOff : labels.topOn}
          </button>
        ) : null}
        {live ? <button type="button" disabled={busy !== null} onClick={() => transition('end', labels.confirmEnd)} className={button}>{icon('end', Square)} {labels.end}</button> : null}
        <button type="button" disabled={busy !== null} onClick={() => run('duplicate', { type: 'deal.duplicate', dealId })} className={button}>{icon('duplicate', Copy)} {labels.duplicate}</button>
        {live ? <a href={`/deals/${slug}`} className={button}><Eye className="size-3.5" aria-hidden /> {labels.view}</a> : null}
        {editable ? <button type="button" disabled={busy !== null} onClick={() => transition('delete', labels.confirmDelete)} className={cn(button, 'text-red-600')}>{icon('delete', Trash2)} {labels.delete}</button> : null}
      </div>
      {error ? <p role="alert" className="mt-2 text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}
