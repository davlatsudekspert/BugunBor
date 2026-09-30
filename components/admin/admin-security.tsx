'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { QrCode } from '@/components/deals/qr-code';

const words = {
  uz: {
    title: 'Admin uchun ikki bosqichli himoya',
    description: 'Telegram orqali tasdiqlangan hisob va Authenticator kodi bilan kirish.',
    fresh: 'Himoyani sozlash uchun hisobdan chiqib, Telegram orqali qayta kiring.',
    reenter: 'Telegram orqali qayta kirish',
    setup: 'Authenticator’ni sozlash',
    instruction: 'Google yoki Microsoft Authenticator’da “+” → QR kodni skanerlashni tanlang. Quyidagi QR kodni skanerlab, ilovadagi 6 raqamli kodni kiriting.',
    private: 'QR kodni boshqalarga yubormang. Sozlash oynasi 10 daqiqa amal qiladi.',
    code: '6 raqamli kod',
    verify: 'Tasdiqlash',
    recovery: 'Zaxira kodi bilan kirish',
    recoveryLabel: 'Zaxira kodi',
    back: 'Authenticator kodi bilan kirish',
    saved: 'Zaxira kodlarini xavfsiz joyga saqlang. Har biri faqat bir marta ishlaydi. Ular yana ko‘rsatilmaydi; Authenticator yo‘qolsa kirish uchun kerak.',
    enter: 'Kodlarni saqladim — admin bo‘limiga kirish',
    error: 'Kod qabul qilinmadi yoki so‘rov bajarilmadi. Qayta kirish zarur bo‘lishi mumkin.',
    rate: 'Urinishlar limiti tugadi. 10 daqiqadan keyin urinib ko‘ring.',
    config: 'Himoyani sozlash uchun server sozlamasi tayyor emas. Sayt egasi HASH_SECRET sozlamasini tekshirishi kerak.',
    home: 'Bosh sahifa',
  },
  ru: {
    title: 'Двухэтапная защита администратора', description: 'Вход через подтверждённый Telegram-аккаунт и код Authenticator.',
    fresh: 'Для настройки защиты выйдите и войдите снова через Telegram.', reenter: 'Войти снова через Telegram', setup: 'Настроить Authenticator',
    instruction: 'В Google или Microsoft Authenticator выберите «+» → «Сканировать QR-код». Отсканируйте QR-код и введите шестизначный код из приложения.',
    private: 'Не передавайте QR-код другим. Настройка действительна 10 минут.', code: 'Шестизначный код', verify: 'Подтвердить',
    recovery: 'Войти с резервным кодом', recoveryLabel: 'Резервный код', back: 'Войти с кодом Authenticator',
    saved: 'Сохраните резервные коды в безопасном месте. Каждый действует один раз. Они больше не будут показаны и нужны при потере Authenticator.',
    enter: 'Коды сохранены — открыть панель', error: 'Код не принят или запрос не выполнен. Возможно, нужно войти заново.',
    rate: 'Лимит попыток исчерпан. Повторите через 10 минут.', config: 'Настройка защиты на сервере не готова. Владелец сайта должен проверить HASH_SECRET.', home: 'Главная',
  },
};

export function AdminSecurity({ enabled, reauthenticate, returnTo, locale }: { enabled: boolean; reauthenticate: boolean; returnTo: string; locale: 'uz' | 'ru' }) {
  const t = words[locale];
  const [uri, setUri] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function send(action: 'setup' | 'verify' | 'recovery') {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/v1/auth/admin-mfa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ...(action === 'setup' ? {} : { code: code.trim() }) }) });
      const data = await response.json() as { data?: { uri?: string; recoveryCodes?: string[] } };
      if (!response.ok || !data.data) { setError(response.status === 429 ? t.rate : response.status === 503 ? t.config : t.error); return; }
      if (data.data.uri) setUri(data.data.uri);
      else if (data.data.recoveryCodes?.length) { setCodes(data.data.recoveryCodes); setUri(null); setCode(''); }
      else window.location.assign(returnTo);
    } catch { setError(t.error); } finally { setBusy(false); }
  }
  async function reenter() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/v1/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Logout failed');
      window.location.assign(`/login?returnTo=${encodeURIComponent(`/admin/security?returnTo=${encodeURIComponent(returnTo)}`)}`);
    } catch { setError(t.error); setBusy(false); }
  }
  const button = 'mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50';
  return (
    <main className="grid min-h-[70vh] place-items-center bg-sand px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <ShieldCheck className="mb-3 size-8 text-primary" aria-hidden />
        <h1 className="text-2xl font-black text-navy">{t.title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{t.description}</p>
        {reauthenticate ? <><p className="mt-4 text-sm leading-6">{t.fresh}</p><button type="button" disabled={busy} className={button} onClick={reenter}>{t.reenter}</button></> : codes.length ? (
          <><p className="mt-4 text-sm leading-6">{t.saved}</p><ul className="mt-4 space-y-1 rounded-xl bg-slate-50 p-3 font-mono text-xs">{codes.map((value) => <li key={value}>{value}</li>)}</ul><a href={returnTo} className={button}>{t.enter}</a></>
        ) : <>
          {!enabled && !uri ? <button type="button" disabled={busy} className={button} onClick={() => send('setup')}>{t.setup}</button> : null}
          {uri ? <><p className="mt-4 text-sm leading-6">{t.instruction}</p><QrCode value={uri} label="Authenticator QR" className="mx-auto mt-4 size-52" /><p className="mt-3 text-xs leading-5 text-slate-500">{t.private}</p></> : null}
          {enabled || uri ? <form onSubmit={(event) => { event.preventDefault(); void send(recovery ? 'recovery' : 'verify'); }} className="mt-5">
            <label className="text-sm font-bold" htmlFor="admin-code">{recovery ? t.recoveryLabel : t.code}</label>
            <input id="admin-code" type="text" inputMode={recovery ? 'text' : 'numeric'} autoComplete="one-time-code" required pattern={recovery ? '[A-Za-z0-9_-]{24}' : '[0-9]{6}'} maxLength={recovery ? 24 : 6} value={code} onChange={(event) => setCode(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 text-lg tracking-widest" />
            <button type="submit" disabled={busy} className={button}>{t.verify}</button>
          </form> : null}
          {enabled ? <button type="button" disabled={busy} onClick={() => { setRecovery(!recovery); setCode(''); setError(''); }} className="mt-4 text-sm font-semibold text-primary underline">{recovery ? t.back : t.recovery}</button> : null}
        </>}
        {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
        <a href="/" className="mt-6 inline-block text-sm text-slate-500 underline">{t.home}</a>
      </section>
    </main>
  );
}
