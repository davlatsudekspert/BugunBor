import type { ErrorCode } from '@/lib/i18n';
import { bytesToBase64, type ImageType } from './service';

// Every public photo (a deal's photo, a business's logo and cover) is looked at
// before it is kept. An AI service says whether any part of it, the background
// and any text included, shows what BugunBor never publishes: military,
// political or religious subjects, nudity, drugs, alcohol and tobacco,
// gambling, hate symbols or personal documents. Such a photo is refused with
// the reason and nothing of it is kept.
//
// Claude (ANTHROPIC_API_KEY) is asked first and Google Gemini (GEMINI_API_KEY)
// when Claude does not answer, both with the same rules and the same answer
// format. The check never blocks an upload: when neither answers, the photo is
// kept unchecked and checked again later (modules/media/recheck.ts). With no
// key at all, photos are kept unchecked.

export const PHOTO_REASONS = ['MILITARY', 'POLITICAL', 'RELIGIOUS', 'ADULT', 'VIOLENCE', 'DRUGS', 'GAMBLING', 'HATE', 'PERSONAL_DATA', 'OTHER'] as const;
export type PhotoReason = (typeof PHOTO_REASONS)[number];

/** In the order they are asked. */
export const PHOTO_PROVIDERS = ['claude', 'gemini'] as const;
export type PhotoProvider = (typeof PHOTO_PROVIDERS)[number];
export const PROVIDER_NAMES: Record<PhotoProvider, string> = { claude: 'Claude', gemini: 'Gemini' };

/** `model` null = the provider's default model. */
export type ProviderConfig = { apiKey: string; model: string | null };
export type PhotoCheckConfig = Record<PhotoProvider, ProviderConfig | null>;

export type PhotoVerdict = { allowed: true } | { allowed: false; reason: PhotoReason; note: string; code: ErrorCode };
export type ProviderFailure = { provider: PhotoProvider; error: string };

/** A verdict from one of the services (with the ones that failed before it), or none of them answered. */
export type PhotoCheckResult =
  | { status: 'CHECKED'; provider: PhotoProvider; verdict: PhotoVerdict; failures: ProviderFailure[] }
  | { status: 'UNAVAILABLE'; failures: ProviderFailure[] };

export type PhotoChecker = (bytes: Uint8Array, mime: ImageType) => Promise<PhotoCheckResult>;

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
/** Google's alias for its newest Flash model, so a retired model name never stops the check; GEMINI_MODEL overrides it. */
export const GEMINI_CHECK_MODEL = 'gemini-flash-latest';
const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS: Record<PhotoProvider, number> = { claude: 12_000, gemini: 15_000 };

/** The same rules for every service. */
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

Refuse only for a real match, and when you refuse, name the one reason that fits best. Give the verdict: allowed (true or false), reason (NONE when allowed) and a note in English, at most 20 words, saying what you saw.`;

const REASON_VALUES = ['NONE', ...PHOTO_REASONS];
const ASK = 'Check this photo.';

const VERDICT_TOOL = {
  name: 'verdict',
  description: 'Whether the photo may be published on BugunBor.',
  input_schema: {
    type: 'object',
    properties: { allowed: { type: 'boolean' }, reason: { type: 'string', enum: REASON_VALUES }, note: { type: 'string' } },
    required: ['allowed', 'reason', 'note'],
  },
} as const;

/** The same answer, as Gemini's response schema. */
const VERDICT_SCHEMA = {
  type: 'OBJECT',
  properties: { allowed: { type: 'BOOLEAN' }, reason: { type: 'STRING', enum: REASON_VALUES }, note: { type: 'STRING' } },
  required: ['allowed', 'reason', 'note'],
} as const;

/** A verdict from the answer's fields; null when they are not a verdict. */
export function toVerdict(input: Record<string, unknown> | null | undefined): PhotoVerdict | null {
  if (!input || typeof input.allowed !== 'boolean') return null;
  if (input.allowed) return { allowed: true };
  const reason = (PHOTO_REASONS as readonly string[]).includes(String(input.reason)) ? (input.reason as PhotoReason) : 'OTHER';
  return { allowed: false, reason, note: typeof input.note === 'string' ? input.note.slice(0, 200) : '', code: REFUSAL[reason] };
}

/** Reads the verdict tool call from a Messages API answer; null when it is not there or malformed. */
export function parseVerdict(answer: unknown): PhotoVerdict | null {
  const content = (answer as { content?: unknown } | null)?.content;
  if (!Array.isArray(content)) return null;
  const call = content.find((item) => item?.type === 'tool_use' && item?.name === VERDICT_TOOL.name) as { input?: Record<string, unknown> } | undefined;
  return toVerdict(call?.input);
}

/** Gemini's stop reasons for a photo it will not look at: that photo is refused. */
const GEMINI_BLOCKED = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'IMAGE_SAFETY', 'IMAGE_PROHIBITED_CONTENT']);

/** Reads the verdict from a generateContent answer; null when it is not there or malformed. */
export function parseGeminiVerdict(answer: unknown): PhotoVerdict | null {
  const data = answer as { promptFeedback?: { blockReason?: string }; candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }> } | null;
  const blocked = data?.promptFeedback?.blockReason ?? (GEMINI_BLOCKED.has(data?.candidates?.[0]?.finishReason ?? '') ? data?.candidates?.[0]?.finishReason : undefined);
  if (blocked) return toVerdict({ allowed: false, reason: 'OTHER', note: `Gemini would not look at it (${blocked}).` });
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  try {
    return toVerdict(JSON.parse(text) as Record<string, unknown>);
  } catch {
    return null;
  }
}

class ProviderError extends Error {}

/** "HTTP 400: Your credit balance is too low…": the status and the service's own words, never the key or the photo. */
async function httpError(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: { message?: unknown } } | null;
  const message = typeof body?.error?.message === 'string' ? `: ${body.error.message}` : '';
  return new ProviderError(`HTTP ${response.status}${message}`.slice(0, 200));
}

async function post(provider: PhotoProvider, url: string, headers: Record<string, string>, body: unknown, fetcher: typeof fetch) {
  let response: Response;
  try {
    response = await fetcher(url, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS[provider]) });
  } catch (error) {
    throw new ProviderError(error instanceof Error && error.name === 'TimeoutError' ? `no answer in ${TIMEOUT_MS[provider] / 1000} s` : 'network error');
  }
  if (!response.ok) throw await httpError(response);
  return response.json().catch(() => null);
}

async function askClaude(config: ProviderConfig, bytes: Uint8Array, mime: ImageType, fetcher: typeof fetch) {
  const answer = await post('claude', CLAUDE_API, { 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' }, {
    model: config.model ?? PHOTO_CHECK_MODEL,
    max_tokens: 300,
    system: PHOTO_RULES,
    tools: [VERDICT_TOOL],
    tool_choice: { type: 'tool', name: VERDICT_TOOL.name },
    messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mime, data: bytesToBase64(bytes) } }, { type: 'text', text: ASK }] }],
  }, fetcher);
  const verdict = parseVerdict(answer);
  if (!verdict) throw new ProviderError('unreadable answer');
  return verdict;
}

async function askGemini(config: ProviderConfig, bytes: Uint8Array, mime: ImageType, fetcher: typeof fetch) {
  const model = config.model ?? GEMINI_CHECK_MODEL;
  // The key goes in a header, never in the address (addresses end up in logs).
  const answer = await post('gemini', `${GEMINI_API}/${encodeURIComponent(model)}:generateContent`, { 'x-goog-api-key': config.apiKey }, {
    systemInstruction: { parts: [{ text: PHOTO_RULES }] },
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType: mime, data: bytesToBase64(bytes) } }, { text: ASK }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: VERDICT_SCHEMA },
    // The rules above decide; Gemini's own filters would only hide the photos we most need to see.
    safetySettings: ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT']
      .map((category) => ({ category, threshold: 'BLOCK_NONE' })),
  }, fetcher);
  const verdict = parseGeminiVerdict(answer);
  if (!verdict) throw new ProviderError('unreadable answer');
  return verdict;
}

const ASKERS: Record<PhotoProvider, typeof askClaude> = { claude: askClaude, gemini: askGemini };

/** Asks the services in turn until one gives a verdict. Never throws. */
export async function checkPhoto(config: PhotoCheckConfig, bytes: Uint8Array, mime: ImageType, fetcher: typeof fetch = fetch): Promise<PhotoCheckResult> {
  const failures: ProviderFailure[] = [];
  for (const provider of PHOTO_PROVIDERS) {
    const settings = config[provider];
    if (!settings) continue;
    try {
      return { status: 'CHECKED', provider, verdict: await ASKERS[provider](settings, bytes, mime, fetcher), failures };
    } catch (error) {
      failures.push({ provider, error: error instanceof ProviderError ? error.message : 'unexpected error' });
    }
  }
  if (failures.length) console.error('Photo check unavailable', failures.map((failure) => `${failure.provider}: ${failure.error}`).join('; '));
  return { status: 'UNAVAILABLE', failures };
}

/** The checker for uploads, or null while no key is set (photos are then kept unchecked). */
export function photoChecker(config: PhotoCheckConfig | null | undefined, fetcher?: typeof fetch): PhotoChecker | null {
  if (!config || !PHOTO_PROVIDERS.some((provider) => config[provider])) return null;
  return (bytes, mime) => checkPhoto(config, bytes, mime, fetcher);
}
