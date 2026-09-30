const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function newTotpSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let bits = 0, value = 0, result = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { bits -= 5; result += ALPHABET[(value >>> bits) & 31]; }
  }
  return result;
}

function decode(secret: string) {
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const char of secret) {
    const digit = ALPHABET.indexOf(char);
    if (digit < 0) throw new Error('Invalid TOTP encoding');
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) { bits -= 8; bytes.push((value >>> bits) & 255); }
  }
  return new Uint8Array(bytes);
}

/** RFC 6238: SHA-1, 30 second steps, six digits (eight for the RFC test vectors). */
export async function totpCode(secret: string, step: number, digits = 6) {
  const counter = new Uint8Array(8);
  new DataView(counter.buffer).setBigUint64(0, BigInt(step));
  const key = await crypto.subtle.importKey('raw', decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, counter));
  const offset = digest[19] & 15;
  const number = ((digest[offset] & 127) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3];
  return String(number % 10 ** digits).padStart(digits, '0');
}

export async function matchingTotpStep(secret: string, code: string, now: Date) {
  if (!/^\d{6}$/.test(code)) return null;
  const current = Math.floor(now.getTime() / 30_000);
  let matched: number | null = null;
  for (const step of [current - 1, current, current + 1]) {
    if (step < 0) continue;
    const expected = await totpCode(secret, step);
    let different = 0;
    for (let i = 0; i < 6; i++) different |= expected.charCodeAt(i) ^ code.charCodeAt(i);
    if (different === 0) matched = step;
  }
  return matched;
}

export function authenticatorUri(secret: string) {
  return `otpauth://totp/BugunBor:Admin?secret=${secret}&issuer=BugunBor&algorithm=SHA1&digits=6&period=30`;
}
