'use client';

import { LoaderCircle, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';

import { apiRequest } from '@/lib/api-client';
import type { Dictionary } from '@/lib/i18n';
import { teamAddSchema } from '@/modules/businesses/schema';
import { Field, FormMessage, fieldMessages, inputClass } from './form-controls';

type Role = 'OWNER' | 'MANAGER' | 'CASHIER';
export type TeamMember = { userId: string; displayName: string; phone: string; role: Role };
type T = Pick<Dictionary, 'biz' | 'validation' | 'common' | 'errors'>;

const ROLES: Role[] = ['CASHIER', 'MANAGER', 'OWNER'];

export function TeamManager({ businessId, currentUserId, members, t }: { businessId: string; currentUserId: string; members: TeamMember[]; t: T }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const team = t.biz.team;

  async function call(key: string, body: unknown) {
    setBusy(key);
    setMessage(null);
    const result = await apiRequest(`/api/v1/business/${businessId}`, body, { networkError: t.common.networkError });
    setBusy(null);
    if (!result.ok) {
      setMessage({ tone: 'error', text: result.message });
      setErrors(fieldMessages(result.fields, t.validation as Record<string, string>));
      return false;
    }
    return true;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {members.map((member) => {
          const self = member.userId === currentUserId;
          return (
            <li key={member.userId} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-bold text-navy">{member.displayName} {self ? <span className="text-xs font-semibold text-slate-400">({team.you})</span> : null}</p>
                <p className="text-sm text-slate-500">{member.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={member.role}
                  disabled={self || busy !== null}
                  aria-label={team.role}
                  onChange={async (event) => {
                    if (await call(`role-${member.userId}`, { type: 'team.role', memberId: member.userId, role: event.target.value })) window.location.reload();
                  }}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-navy disabled:opacity-60"
                >
                  {ROLES.map((role) => <option key={role} value={role}>{team.roles[role]}</option>)}
                </select>
                {!self ? (
                  <button
                    type="button"
                    aria-label={team.remove}
                    disabled={busy !== null}
                    onClick={async () => {
                      if (!window.confirm(team.confirmRemove)) return;
                      if (await call(`remove-${member.userId}`, { type: 'team.remove', memberId: member.userId })) window.location.reload();
                    }}
                    className="grid size-9 place-items-center rounded-lg border border-slate-200 text-red-600 disabled:opacity-60"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <form
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const parsed = teamAddSchema.safeParse(Object.fromEntries(new FormData(form).entries()));
          if (!parsed.success) {
            const fields: Record<string, string> = {};
            for (const issue of parsed.error.issues) fields[issue.path.join('.')] = issue.message;
            setErrors(fieldMessages(fields, t.validation as Record<string, string>));
            return;
          }
          setErrors({});
          if (await call('add', { type: 'team.add', data: parsed.data })) {
            setMessage({ tone: 'success', text: team.added });
            setTimeout(() => window.location.reload(), 600);
          }
        }}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <h3 className="flex items-center gap-2 font-black text-navy"><UserPlus className="size-5 text-primary" aria-hidden /> {team.add}</h3>
        <Field label={team.phone} error={errors.phone} hint={team.hint}>
          <input name="phone" type="tel" inputMode="tel" defaultValue="+998" className={inputClass} />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-bold text-navy">{team.role}</legend>
          <div className="space-y-2">
            {ROLES.map((role, index) => (
              <label key={role} className="grid cursor-pointer grid-cols-[auto_1fr] items-start gap-x-3 rounded-xl border border-slate-200 p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input type="radio" name="role" value={role} defaultChecked={index === 0} className="row-span-2 mt-1 accent-[var(--primary)]" />
                <strong className="text-sm text-navy">{team.roles[role]}</strong>
                <span className="col-start-2 text-xs text-slate-500">{team.roleHints[role]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}
        <button disabled={busy !== null} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white disabled:opacity-60">
          {busy === 'add' ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null} {team.add}
        </button>
      </form>
    </div>
  );
}
