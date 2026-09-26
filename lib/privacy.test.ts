import { describe, expect, it } from 'vitest';

import { LOGIN_TTL_MINUTES } from '@/modules/auth/login';
import { SESSION_DAYS } from '@/modules/auth/sessions';
import { MISSING_LABELS, PLACEHOLDER, PRIVACY_LOCALES, missingDetails, privacyPolicy, type PrivacyDetails } from './privacy';
import { RETENTION } from './retention';

const text = (details?: PrivacyDetails) =>
  PRIVACY_LOCALES.map((locale) => {
    const policy = privacyPolicy(locale, details);
    return [policy.title, policy.updated, policy.intro, ...policy.sections.flatMap((section) => [section.title, ...(section.paragraphs ?? []), ...(section.items ?? []), section.after ?? ''])].join('\n');
  }).join('\n');

const filled: PrivacyDetails = {
  operatorName: 'Test Operator',
  registration: { uz: 'guvohnoma № 1', ru: 'свидетельство № 1', en: 'certificate No. 1' },
  address: { uz: 'Toshkent', ru: 'Ташкент', en: 'Tashkent' },
  officer: { uz: 'Test Mas’ul', ru: 'Тест Ответственный', en: 'Test Officer' },
  email: 'test@example.com',
  databaseLocation: { uz: 'Yevropa', ru: 'Европа', en: 'Europe' },
  minAge: 16,
};

describe('privacy policy', () => {
  it('has the same sections in every language, in the order the operator asked for', () => {
    const ids = PRIVACY_LOCALES.map((locale) => privacyPolicy(locale).sections.map((section) => section.id));
    expect(ids[1]).toEqual(ids[0]);
    expect(ids[2]).toEqual(ids[0]);
    const required = ['operator', 'collect', 'purpose', 'public', 'services', 'age', 'security', 'retention', 'rights', 'disclosure', 'storage', 'deletion', 'contact'];
    expect(ids[0].filter((id) => required.includes(id))).toEqual(required);
  });

  it('marks every detail the operator has not confirmed and nothing else', () => {
    expect(missingDetails()).toEqual(Object.values(MISSING_LABELS));
    const markers = new Set(text().match(PLACEHOLDER));
    expect([...markers].sort()).toEqual(Object.values(MISSING_LABELS).map((label) => `[TO'LDIRISH KERAK: ${label}]`).sort());
    expect(missingDetails(filled)).toEqual([]);
    expect(text(filled)).not.toMatch(PLACEHOLDER);
  });

  it('quotes the same periods the code uses', () => {
    expect(LOGIN_TTL_MINUTES).toBe(10);
    const uz = text().split('\n');
    expect(uz).toContain(`bb_session — tizimga kirganingizni eslab qoladi, ${SESSION_DAYS} kun; sahifadagi skriptlar uni o‘qiy olmaydi.`);
    expect(uz).toContain(`Telegram xabarnomalari navbati — ${RETENTION.notificationDays} kun.`);
    expect(text()).toContain(`«Bog‘lanish» orqali kelgan murojaatlar — ${RETENTION.logYears} yilgacha`);
  });

  it('describes only BugunBor, with no identifiers of another product or person', () => {
    const all = text(filled);
    expect(all).not.toMatch(/NFC|Reels|Gemini|Anthropic|Resend|Google Play|auksion|аукцион|nfcstore|7199859|Shahrixon|Шахрихан/i);
    expect(all).not.toMatch(/reyestr|реестр|register of personal data/i);
  });
});
