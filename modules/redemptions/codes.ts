import { sha256Hex } from '@/lib/crypto';

// 32 symbols without 0/O and 1/I, so every character is unambiguous and each
// one carries exactly 5 bits: 32^6 ≈ 1.07 billion possible codes.
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

/**
 * The customer's code is derived from the redemption id with an HMAC, so it
 * can be shown again in "My codes" without ever being stored in plain text.
 */
export async function deriveRedemptionCode(secret: string, redemptionId: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`redemption:${redemptionId}`)));
  let code = '';
  for (let index = 0; index < CODE_LENGTH; index += 1) code += CODE_ALPHABET[bytes[index] & 31];
  return code;
}

export async function hashRedemptionCode(secret: string, code: string) {
  return sha256Hex(`${secret}:code:${code}`);
}

/** Uppercases and strips spaces/dashes; returns null unless it is a well-formed code. */
export function normalizeRedemptionCode(input: string) {
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== CODE_LENGTH) return null;
  for (const char of code) if (!CODE_ALPHABET.includes(char)) return null;
  return code;
}

/** Accepts a raw code or a scanned QR link such as https://bugunbor.uz/r/K7P2QX. */
export function codeFromScan(value: string) {
  const trimmed = value.trim();
  const fromPath = /\/r\/([A-Za-z0-9-]{6,8})\/?(?:[?#].*)?$/.exec(trimmed)?.[1];
  const fromQuery = /[?&]code=([A-Za-z0-9-]{6,8})/.exec(trimmed)?.[1];
  return normalizeRedemptionCode(fromPath ?? fromQuery ?? trimmed);
}

export function formatRedemptionCode(code: string) {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}
