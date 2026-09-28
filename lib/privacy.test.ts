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

const empty: PrivacyDetails = { operator: null, officer: null, email: null, databaseLocation: null, minAge: null };

describe('privacy policy', () => {
  it('has the same sections in every language, in the order the operator asked for', () => {
    const ids = PRIVACY_LOCALES.map((locale) => privacyPolicy(locale).sections.map((section) => section.id));
    expect(ids[1]).toEqual(ids[0]);
    expect(ids[2]).toEqual(ids[0]);
    const required = ['operator', 'collect', 'purpose', 'public', 'services', 'age', 'security', 'retention', 'rights', 'disclosure', 'storage', 'deletion', 'contact'];
    expect(ids[0].filter((id) => required.includes(id))).toEqual(required);
  });

  it('is complete: every operator detail is filled in', () => {
    expect(missingDetails()).toEqual([]);
    expect(text()).not.toMatch(PLACEHOLDER);
    expect(text()).toContain('davlatsudekspert@gmail.com');
    expect(text()).toContain('BugunBor 16 yoshga to‘lgan foydalanuvchilar uchun.');
  });

  it('would mark each missing detail instead of inventing it', () => {
    expect(missingDetails(empty)).toEqual(Object.values(MISSING_LABELS));
    const markers = new Set(text(empty).match(PLACEHOLDER));
    expect([...markers].sort()).toEqual(Object.values(MISSING_LABELS).map((label) => `[TO'LDIRISH KERAK: ${label}]`).sort());
  });

  it('names Anthropic only for the check of public business photos, never for profile photos or texts', () => {
    for (const locale of PRIVACY_LOCALES) {
      const policy = privacyPolicy(locale);
      const lines = policy.sections.flatMap((section) => [...(section.paragraphs ?? []), ...(section.items ?? []), section.after ?? '']);
      const mentions = lines.filter((line) => /Anthropic/.test(line));
      expect(mentions.length).toBeGreaterThanOrEqual(3);
      // Each mention is about photos (the check, the processor list, where they go).
      expect(mentions.every((line) => /rasm|фото|photo/i.test(line))).toBe(true);
    }
    expect(text()).toContain('Profil rasmingiz tekshiruvga yuborilmaydi.');
  });

  it('names Google Gemini as the fallback of the same photo check, and says an unchecked photo is checked later', () => {
    for (const locale of PRIVACY_LOCALES) {
      const policy = privacyPolicy(locale);
      const lines = policy.sections.flatMap((section) => [...(section.paragraphs ?? []), ...(section.items ?? []), section.after ?? '']);
      const mentions = lines.filter((line) => /Gemini/.test(line));
      expect(mentions.length).toBeGreaterThanOrEqual(3);
      expect(mentions.every((line) => /rasm|фото|photo/i.test(line))).toBe(true);
    }
    expect(text()).toContain('Google LLC (Gemini API)');
    expect(text()).toContain('Anthropic yoki Google (AQSh)');
    expect(text()).toContain('rasm «tekshirilmagan» holda saqlanadi va keyinroq qayta tekshiriladi');
    expect(text()).toContain('matn tashqi xizmatga yuborilmaydi');
  });

  it('quotes the same periods the code uses', () => {
    expect(LOGIN_TTL_MINUTES).toBe(10);
    const uz = text().split('\n');
    expect(uz).toContain(`bb_session — tizimga kirganingizni eslab qoladi, ${SESSION_DAYS} kun; sahifadagi skriptlar uni o‘qiy olmaydi.`);
    expect(uz).toContain(`Telegram xabarnomalari navbati — ${RETENTION.notificationDays} kun.`);
    expect(text()).toContain(`«Bog‘lanish» orqali kelgan murojaatlar — ${RETENTION.logYears} yilgacha`);
  });

  it('describes only BugunBor, with no other product’s features and no home address', () => {
    const all = text();
    expect(all).not.toMatch(/NFC|Reels|Resend|Google Play|auksion|аукцион|nfcstore/i);
    expect(all).not.toMatch(/ko‘chasi|улица|ул\.|street|uy\b|дом \d/i);
    expect(all).not.toMatch(/reyestr|реестр|register of personal data/i);
  });
});
