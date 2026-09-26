import { normalizeRedemptionCode } from '@/modules/redemptions/codes';

// Target of the QR code on a customer's claim: staff who scan it with a
// normal phone camera land on the validation page with the code filled in.
export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const normalized = normalizeRedemptionCode(code);
  const location = normalized ? `/business/redeem?code=${normalized}` : '/business/redeem';
  return new Response(null, { status: 302, headers: { location, 'cache-control': 'no-store' } });
}
