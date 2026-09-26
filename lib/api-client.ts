export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; fields?: Record<string, string> };

/** JSON request from client components; never throws. */
export async function apiRequest<T = unknown>(url: string, body?: unknown, options: { method?: string; networkError?: string } = {}): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method: options.method ?? 'POST',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { data?: T; error?: { code: string; message: string; fields?: Record<string, string> } };
    if (response.ok) return { ok: true, data: payload.data as T };
    return { ok: false, code: payload.error?.code ?? 'SERVER', message: payload.error?.message ?? options.networkError ?? 'Error', fields: payload.error?.fields };
  } catch {
    return { ok: false, code: 'NETWORK', message: options.networkError ?? 'Network error' };
  }
}
