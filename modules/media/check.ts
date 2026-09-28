import type { ErrorCode } from '@/lib/i18n';
import { DomainError } from '@/modules/errors';
import { bytesToBase64, type ImageType } from './service';

// Every public photo (a deal's photo, a business's logo and cover) is looked at
// before it is kept. Claude says whether any part of it, the background and any
// text included, shows what BugunBor never publishes: military, political or
// religious subjects, nudity, drugs, alcohol and tobacco, gambling, hate
// symbols or personal documents. Such a photo is refused with the reason and
// nothing of it is kept. The key is the ANTHROPIC_API_KEY Worker secret; while
// it is not set, photos are kept unchecked. Once it is set, a photo that could
// not be checked is not kept either: the person is asked to try again.

export const PHOTO_REASONS = ['MILITARY', 'POLITICAL', 'RELIGIOUS', 'ADULT', 'VIOLENCE', 'DRUGS', 'GAMBLING', 'HATE', 'PERSONAL_DATA', 'OTHER'] as const;
export type PhotoReason = (typeof PHOTO_REASONS)[number];

/** `model` null = PHOTO_CHECK_MODEL. */
export type PhotoCheckConfig = { apiKey: string; model: string | null };
export type PhotoVerdict = { allowed: true } | { allowed: false; reason: PhotoReason; note: string; code: ErrorCode };
export type PhotoChecker = (bytes: Uint8Array, mime: ImageType) => Promise<PhotoVerdict>;

/** What the uploader is told: the reasons they can act on have their own message. */
const REFUSAL: Record<PhotoReason, ErrorCode> = {
  MILITARY: 'PHOTO_MILITARY',
  POLITICAL: 'PHOTO_POLITICAL',
  RELIGIOUS: 'PHOTO_RELIGIOUS',
  ADULT: 'PHOTO_ADULT',
  DRUGS: 'PHOTO_DRUGS',
  PERSONAL_DATA: 'PHOTO_PERSONAL_DATA',
  VIOLENCE: 'PHOTO_REJECTED',
  GAMBLING: 'PHOTO_REJECTED',
  HATE: 'PHOTO_REJECTED',
  OTHER: 'PHOTO_REJECTED',
};

export const PHOTO_CHECK_MODEL = 'claude-sonnet-5';
const API = 'https://api.anthropic.com/v1/messages';
const ATTEMPTS = 2;
const TIMEOUT_MS = 12_000;

export const PHOTO_RULES = `You check photos that businesses upload to BugunBor, a deals marketplace in Uzbekistan: a deal's photo, a business logo or a shop cover. The photo will be shown to everyone. Decide whether it may be published.

Refuse it when any part of it shows one of these, including the background, small details and any readable text or sign:
- MILITARY: weapons or ammunition, military or police uniforms, camouflage clothing or patterns, military vehicles or equipment, war scenes, text about the army or defence.
- POLITICAL: flags of any country or organisation, state emblems or coats of arms, politicians or state leaders, elections, rallies or protests, political parties, slogans or symbols.
- RELIGIOUS: places of worship inside or out (mosques, churches, temples, synagogues, shrines), religious symbols, scripture or religious calligraphy, prayer scenes, clergy.
- ADULT: nudity, people in underwear, sexual or suggestive content.
- VIOLENCE: blood, injuries, violence or cruelty (a sports match is fine).
- DRUGS: narcotics or drug use; alcohol, tobacco, vapes or hookahs.
- GAMBLING: casinos, betting or lotteries.
- HATE: extremist or hate symbols, insulting gestures or words.
- PERSONAL_DATA: passports, ID cards, bank cards or documents showing personal details.
- OTHER: anything else illegal in Uzbekistan or plainly shocking.

These are fine: food, tea, coffee and soft drinks; products and shops; services and people at work; sport in sportswear (kurash, boxing, football); national dress, the doppi and an ordinary headscarf; ornaments, ceramics, fabrics and woodcarving; logos and plain business text.

Refuse only for a real match, and when you refuse, name the one reason that fits best. Answer with the verdict tool; write the note in English, at most 20 words, saying what you saw.`;

const VERDICT_TOOL = {
  name: 'verdict',
  description: 'Whether the photo may be published on BugunBor.',
  input_schema: {
    type: 'object',
    properties: {
      allowed: { type: 'boolean' },
      reason: { type: 'string', enum: ['NONE', ...PHOTO_REASONS] },
      note: { type: 'string' },
    },
    required: ['allowed', 'reason', 'note'],
  },
} as const;

/** Reads the verdict tool call from a Messages API answer; null when it is not there or malformed. */
export function parseVerdict(answer: unknown): PhotoVerdict | null {
  const content = (answer as { content?: unknown } | null)?.content;
  if (!Array.isArray(content)) return null;
  const call = content.find((item) => item?.type === 'tool_use' && item?.name === VERDICT_TOOL.name) as { input?: Record<string, unknown> } | undefined;
  const input = call?.input;
  if (!input || typeof input.allowed !== 'boolean') return null;
  if (input.allowed) return { allowed: true };
  const reason = (PHOTO_REASONS as readonly string[]).includes(String(input.reason)) ? (input.reason as PhotoReason) : 'OTHER';
  return { allowed: false, reason, note: typeof input.note === 'string' ? input.note.slice(0, 200) : '', code: REFUSAL[reason] };
}

/** Asks Claude about one photo. Throws PHOTO_CHECK_UNAVAILABLE when no clear answer comes. */
export async function checkPhoto(config: PhotoCheckConfig, bytes: Uint8Array, mime: ImageType, fetcher: typeof fetch = fetch): Promise<PhotoVerdict> {
  const body = JSON.stringify({
    model: config.model ?? PHOTO_CHECK_MODEL,
    max_tokens: 300,
    system: PHOTO_RULES,
    tools: [VERDICT_TOOL],
    tool_choice: { type: 'tool', name: VERDICT_TOOL.name },
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mime, data: bytesToBase64(bytes) } },
        { type: 'text', text: 'Check this photo.' },
      ],
    }],
  });
  let status: number | string = 'no answer';
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const response = await fetcher(API, {
      method: 'POST',
      headers: { 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch(() => null);
    if (response?.ok) {
      const verdict = parseVerdict(await response.json().catch(() => null));
      if (verdict) return verdict;
      status = 'unreadable answer';
      break;
    }
    status = response?.status ?? 'no answer';
    // A wrong key or model will not be right a second later; a busy or slow service may be.
    if (response && response.status < 500 && response.status !== 429) break;
  }
  // Only the status: never the key, the photo or the answer.
  console.error('Photo check unavailable', status);
  throw new DomainError('PHOTO_CHECK_UNAVAILABLE', 503);
}

/** The checker for uploads, or null while no key is set (photos are then kept unchecked). */
export function photoChecker(config: PhotoCheckConfig | null | undefined, fetcher?: typeof fetch): PhotoChecker | null {
  if (!config) return null;
  return (bytes, mime) => checkPhoto(config, bytes, mime, fetcher);
}
