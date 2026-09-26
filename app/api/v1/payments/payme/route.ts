import { getDb } from '@/db/client';
import { getConfig } from '@/lib/env';
import { PAYME_ERROR, handlePayme, paymeAuthorized, paymeError } from '@/modules/payments/payme';
import { callbackOpen } from '@/modules/payments/service';

type RpcBody = { id?: string | number | null; method?: unknown; params?: Record<string, unknown> };

async function readBody(request: Request): Promise<RpcBody | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' ? (body as RpcBody) : null;
  } catch {
    return null;
  }
}

// Payme Merchant API endpoint (called by Payme's servers, never by browsers).
// Always HTTP 200 with a JSON-RPC body, as Payme expects. Order: payments
// closed → auth → body → method. Secrets are never logged.
export async function POST(request: Request) {
  const payments = getConfig().payments;
  const body = await readBody(request);
  const id = body?.id ?? null;
  if (!callbackOpen(payments, 'PAYME') || !payments.payme) return Response.json(paymeError(id, PAYME_ERROR.AUTH, 'payments_disabled'));
  if (!paymeAuthorized(request.headers.get('authorization'), payments.payme.key)) {
    console.warn('Payme: authorization rejected');
    return Response.json(paymeError(id, PAYME_ERROR.AUTH));
  }
  if (!body) return Response.json(paymeError(null, PAYME_ERROR.PARSE));
  if (typeof body.method !== 'string') return Response.json(paymeError(id, PAYME_ERROR.INVALID_REQUEST));
  return Response.json(await handlePayme(await getDb(), body, { fiscal: payments.payme.fiscal }));
}
