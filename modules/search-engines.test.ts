import { describe, expect, it } from 'vitest';

import { marketplace } from '@/test/fixtures';
import { siteVerification, updateSiteVerification, verificationCode } from './search-engines';

// Google Search Console and Yandex Webmaster check for their code on the home
// page before they take the sitemap.

const GOOGLE = 'x3Yf9Kq-2hZ_abcdEFGH1234567890ijklmnoPQRSt';
const YANDEX = '4f2a9c1b7d3e8a60';

describe('search engine verification codes', () => {
  it('takes the code alone or the whole tag, for its own engine only', () => {
    expect(verificationCode('google', GOOGLE)).toBe(GOOGLE);
    expect(verificationCode('google', `  <meta name="google-site-verification" content="${GOOGLE}" />  `)).toBe(GOOGLE);
    expect(verificationCode('yandex', `<meta name='yandex-verification' content='${YANDEX}' />`)).toBe(YANDEX);
    expect(verificationCode('google', '   ')).toBe('');
    // Another engine's tag, markup, words or a stub are not codes.
    expect(verificationCode('google', `<meta name="yandex-verification" content="${YANDEX}" />`)).toBeNull();
    expect(verificationCode('google', `<script>alert("${GOOGLE}")</script>`)).toBeNull();
    expect(verificationCode('yandex', 'not a code at all')).toBeNull();
    expect(verificationCode('yandex', 'abc')).toBeNull();
  });

  it('are kept with an audit line, and an empty field takes one away', async () => {
    const db = await marketplace();
    expect(await siteVerification(db)).toEqual({ google: '', yandex: '' });
    await updateSiteVerification(db, { actorId: 'mod', codes: { google: GOOGLE, yandex: YANDEX } });
    expect(await siteVerification(db)).toEqual({ google: GOOGLE, yandex: YANDEX });
    expect(await db.prepare(`SELECT after_json AS after FROM audit_logs WHERE action = 'seo.verification'`).first()).toEqual({ after: JSON.stringify({ google: GOOGLE, yandex: YANDEX }) });
    await updateSiteVerification(db, { actorId: 'mod', codes: { google: '', yandex: YANDEX } });
    expect(await siteVerification(db)).toEqual({ google: '', yandex: YANDEX });
  });
});
