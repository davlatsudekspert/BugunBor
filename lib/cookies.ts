export function readCookie(request: Request, name: string) {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      const value = part.slice(index + 1).trim();
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}

type CookieOptions = {
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
  path?: string;
};

export function serializeCookie(name: string, value: string, options: CookieOptions = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path ?? '/'}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  if (options.httpOnly ?? true) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  parts.push(`SameSite=${options.sameSite ?? 'Lax'}`);
  return parts.join('; ');
}

export function isSecureRequest(request: Request) {
  const url = new URL(request.url);
  return url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
}
