import { NextResponse } from 'next/server';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { handlePaymeMethod, PaymeErrorCode, PaymeRpcError, verifyPaymeWebhookAuth } from '@/modules/billing/payme';

type PaymeRpcRequest = { method?: string; params?: Record<string, unknown>; id?: number | string | null };

/**
 * Payme's own servers call this — never a browser. Every method (CheckPerformTransaction,
 * CreateTransaction, PerformTransaction, CancelTransaction, CheckTransaction, GetStatement) is
 * a standard JSON-RPC 2.0 call authenticated by HTTP Basic auth (login "Paycom", password =
 * PAYME_SECRET_KEY) — see modules/billing/payme.ts, which owns the actual state machine
 * against business_plan_orders. The response is always HTTP 200 with a JSON-RPC envelope, per
 * Payme's own spec — a non-200 status here is read as "merchant server is down", not as an
 * application error.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PaymeRpcRequest | null;
  const id = body?.id ?? null;

  if (!verifyPaymeWebhookAuth(request)) {
    return NextResponse.json({ jsonrpc: '2.0', id, error: { code: PaymeErrorCode.INSUFFICIENT_PRIVILEGE, message: 'Insufficient privilege to perform this method.' } });
  }
  if (!body?.method) {
    return NextResponse.json({ jsonrpc: '2.0', id, error: { code: PaymeErrorCode.PARSE_ERROR, message: 'Error in request.' } });
  }

  await ensurePhase1Database();
  try {
    const result = await handlePaymeMethod(getD1(), body.method, body.params ?? {});
    return NextResponse.json({ jsonrpc: '2.0', id, result });
  } catch (error) {
    if (error instanceof PaymeRpcError) {
      return NextResponse.json({ jsonrpc: '2.0', id, error: { code: error.code, message: error.message } });
    }
    console.error('[payme webhook]', error);
    return NextResponse.json({ jsonrpc: '2.0', id, error: { code: PaymeErrorCode.CANNOT_PERFORM_OR_CANCEL, message: 'Internal error.' } });
  }
}
