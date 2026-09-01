import { describe, expect, it } from 'vitest';

import { validateNfcStoreProfileUrl } from './nfcstore';

describe('validateNfcStoreProfileUrl', () => {
  it.each([
    ['https://nfcstore.uz/company-123', 'https://nfcstore.uz/company-123'],
    ['https://NFCStore.uz/Company-123', 'https://nfcstore.uz/Company-123'],
    ['https://nfcstore.uz/company/', 'https://nfcstore.uz/company'],
    ['https://nfcstore.uz', 'https://nfcstore.uz'],
    ['https://nfcstore.uz/', 'https://nfcstore.uz'],
    ['https://business.nfcstore.uz/co', 'https://business.nfcstore.uz/co'],
    ['  https://nfcstore.uz/co  ', 'https://nfcstore.uz/co'],
  ])('accepts and normalizes %s', (input, expected) => {
    const result = validateNfcStoreProfileUrl(input);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.normalizedUrl).toBe(expected);
  });

  it.each([
    '',
    '   ',
    'not a url',
    'http://nfcstore.uz/co', // wrong protocol
    'javascript:alert(1)',
    'https://evil.com/nfcstore.uz', // substring, not the real host
    'https://nfcstore.uz.evil.com/co', // suffix trick
    'https://user:pass@nfcstore.uz/co', // embedded credentials
    `https://nfcstore.uz/${'a'.repeat(400)}`, // too long overall
  ])('rejects %s', (input) => {
    const result = validateNfcStoreProfileUrl(input);
    expect(result.ok).toBe(false);
  });
});
