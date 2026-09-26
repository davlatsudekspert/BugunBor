import { z } from 'zod';

import { readCookie } from '@/lib/cookies';
import { DEFAULT_LOCALE, LOCALE_COOKIE, errorMessage, fmt, getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { DomainError, isDomainError } from '@/modules/errors';

export function requestLocale(request: Request): Locale {
  const value = readCookie(request, LOCALE_COOKIE) ?? request.headers.get('x-locale');
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** The session token a mobile app sends as `Authorization: Bearer <token>`. */
export function bearerToken(request: Request) {
  const match = /^Bearer\s+([A-Za-z0-9_-]{20,100})$/.exec(request.headers.get('authorization') ?? '');
  return match ? match[1] : null;
}

/** Which client made the request: the mobile app sends `x-app: bugunbor` and its build number. */
export function requestClient(request: Request): { client: 'app' | 'web'; build: string | null } {
  if (request.headers.get('x-app') !== 'bugunbor') return { client: 'web', build: null };
  const build = request.headers.get('x-app-build');
  return { client: 'app', build: build && /^\d{1,9}$/.test(build) ? build : null };
}

export function clientIp(request: Request) {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

/**
 * Cookie-authenticated writes must come from our own pages. Browsers send
 * Origin on POST/PATCH/DELETE; Sec-Fetch-Site covers the rare case without it.
 */
export function assertSameOrigin(request: Request) {
  // A bearer token is never sent by a browser on its own, so such requests carry no ambient credentials.
  if (bearerToken(request) && !readCookie(request, 'bb_session')) return;
  const origin = request.headers.get('origin');
  const url = new URL(request.url);
  if (origin) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new DomainError('CSRF');
    }
    if (parsed.host !== url.host) throw new DomainError('CSRF');
    return;
  }
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') throw new DomainError('CSRF');
}

export async function readJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) throw new DomainError('VALIDATION', 415);
  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error);
  return parsed.data;
}

export class ValidationError extends Error {
  constructor(readonly issues: z.ZodError) {
    super('VALIDATION');
  }
}

function fieldErrors(error: z.ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
}

export function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  if (!headers.has('cache-control')) headers.set('cache-control', 'no-store');
  return Response.json(data, { ...init, headers });
}

export function errorResponse(request: Request, error: unknown) {
  const t = getDictionary(requestLocale(request));
  if (error instanceof ValidationError) {
    return json({ error: { code: 'VALIDATION', message: t.errors.VALIDATION, fields: fieldErrors(error.issues) } }, { status: 422 });
  }
  if (isDomainError(error)) {
    const message = fmt(errorMessage(t, error.code), error.detail ?? {});
    const headers: Record<string, string> = error.code === 'RATE_LIMITED' ? { 'retry-after': '60' } : {};
    return json({ error: { code: error.code, message } }, { status: error.status, headers });
  }
  console.error('Unhandled API error', error);
  return json({ error: { code: 'SERVER', message: t.errors.SERVER } }, { status: 500 });
}

/** Wraps a route handler so domain and validation errors become localized JSON. */
export function route<Args extends unknown[]>(handler: (request: Request, ...args: Args) => Promise<Response>) {
  return async (request: Request, ...args: Args) => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      return errorResponse(request, error);
    }
  };
}

/** Returns a same-site path to redirect to after login, or the fallback. */
export function safeReturnPath(value: unknown, fallback = '/') {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (value.length > 500) return fallback;
  return value;
}
