// Firebase Cloud Messaging (HTTP v1) from a Worker: a service-account JWT is
// exchanged for an access token (cached per isolate), then each message goes
// to one device token. Nothing here runs until FCM_SERVICE_ACCOUNT is set.

export type PushMessage = { title: string; body: string; link: string };
export type PushResult = 'sent' | 'invalid-token' | 'failed';
export type PushSender = { send(token: string, message: PushMessage): Promise<PushResult> };

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

const base64url = (bytes: Uint8Array | string) => {
  const raw = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  let binary = '';
  for (const byte of raw) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
};

function pemToDer(pem: string) {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const binary = atob(body);
  const out = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) out[index] = binary.charCodeAt(index);
  return out;
}

export function parseServiceAccount(json: string): ServiceAccount | null {
  try {
    const value = JSON.parse(json) as Partial<ServiceAccount>;
    return value.project_id && value.client_email && value.private_key ? (value as ServiceAccount) : null;
  } catch {
    return null;
  }
}

/** A signed JWT asking Google for an FCM access token. */
export async function serviceAccountJwt(account: ServiceAccount, now = new Date()) {
  const iat = Math.floor(now.getTime() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp: iat + 3600,
  }));
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(account.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`)));
  return `${header}.${claims}.${base64url(signature)}`;
}

let cachedToken: { value: string; until: number; email: string } | null = null;

export function createFcmSender(serviceAccountJson: string, fetchImpl: typeof fetch = fetch): PushSender | null {
  const account = parseServiceAccount(serviceAccountJson);
  if (!account) return null;

  async function accessToken() {
    if (cachedToken && cachedToken.email === account!.client_email && cachedToken.until > Date.now()) return cachedToken.value;
    const response = await fetchImpl('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: await serviceAccountJwt(account!) }),
    });
    const payload = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number };
    if (!response.ok || !payload.access_token) throw new Error(`FCM auth failed: ${response.status}`);
    cachedToken = { value: payload.access_token, until: Date.now() + ((payload.expires_in ?? 3600) - 120) * 1000, email: account!.client_email };
    return cachedToken.value;
  }

  return {
    async send(token, message) {
      const response = await fetchImpl(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${await accessToken()}` },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: message.title, body: message.body },
            data: { link: message.link },
            android: { priority: 'HIGH', notification: { channel_id: 'deals' } },
          },
        }),
      });
      if (response.ok) return 'sent';
      const text = await response.text().catch(() => '');
      if (response.status === 404 || /UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT/.test(text)) return 'invalid-token';
      return 'failed';
    },
  };
}

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

/** Turns a Telegram (HTML) notification into a push: first line is the title, the rest the body. */
export function pushFromTelegram(html: string, link: string): PushMessage {
  const plain = html.replace(/<[^>]+>/g, '').replace(/&(amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity] ?? entity);
  const lines = plain.split('\n').map((line) => line.trim()).filter(Boolean);
  return { title: (lines[0] ?? 'BugunBor').slice(0, 120), body: lines.slice(1).join('\n').slice(0, 400), link };
}
