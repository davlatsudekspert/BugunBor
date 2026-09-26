import { getDb } from '@/db/client';
import { getConfig } from '@/lib/env';
import { CLICK_ERROR, clickFail, handleClickPrepare, readClickParams } from '@/modules/payments/click';
import { callbackOpen } from '@/modules/payments/service';

// Click SHOP API "Prepare URL" (called by Click's servers).
export async function POST(request: Request) {
  const params = await readClickParams(request);
  if (!params) return Response.json(clickFail({}, CLICK_ERROR.BAD_REQUEST));
  const payments = getConfig().payments;
  if (!callbackOpen(payments, 'CLICK') || !payments.click) return Response.json(clickFail(params, CLICK_ERROR.BAD_REQUEST));
  try {
    return Response.json(await handleClickPrepare(await getDb(), params, payments.click));
  } catch (error) {
    console.error('Click prepare', error instanceof Error ? error.message : 'unknown');
    return Response.json(clickFail(params, CLICK_ERROR.UPDATE_FAILED));
  }
}
