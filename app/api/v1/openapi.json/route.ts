import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ openapi: '3.1.0', info: { title: 'BugunBor API', version: '1.0.0-phase1', description: 'Mobile and NFCStore integration boundary. All timestamps are UTC.' }, servers: [{ url: '/api/v1' }], paths: {
    '/deals': { get: { summary: 'List active deals', parameters: [{ name: 'city', in: 'query', schema: { type: 'string' } }, { name: 'q', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Active deals' } } } },
    '/deals/{id}/redemptions': { post: { summary: 'Claim an active deal atomically', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', minLength: 12 } }], responses: { '201': { description: 'Claimed' }, '409': { description: 'Expired, sold out, limit, or concurrency conflict' } } } },
    '/businesses': { post: { summary: 'Submit business onboarding (requires acceptedRules: "on")', responses: { '201': { description: 'Pending moderation' }, '401': { description: 'Authentication required' } } } },
    '/business/deals': { post: { summary: 'Submit a new deal for a verified business the caller manages (requires acceptedRules: "on"); rejects a discounted price that is not below the original price', responses: { '201': { description: 'Pending moderation' }, '403': { description: 'No deal.write role on a VERIFIED business' } } } },
    '/business/deals/{id}': { post: { summary: 'Edit a deal: broad edits before it launches, only price-down/quantity-up/end-early once ACTIVE', responses: { '200': { description: 'Updated' }, '409': { description: 'No longer editable, or the change would raise the price / lower stock / extend the deadline' } } } },
    '/business/deals/{id}/cancel': { post: { summary: 'Withdraw a deal before it has ever gone live (soft delete)', responses: { '200': { description: 'Canceled' }, '409': { description: 'Already live or finished — use /stop instead' } } } },
    '/business/deals/{id}/stop': { post: { summary: 'End a live deal immediately', responses: { '200': { description: 'Stopped (status: PAUSED)' } } } },
    '/business/redemptions/validate': { post: { summary: 'Redeem a customer’s one-time code at the branch (code in the JSON body) — the other half of POST /deals/{id}/redemptions', responses: { '200': { description: 'Redeemed' }, '404': { description: 'Code not found for this business' }, '409': { description: 'Already used or expired' } } } },
    '/admin/auth/request-otp': { post: { summary: 'Request an admin login code over Telegram', responses: { '200': { description: 'Code sent if the phone is a registered admin (response is generic either way)' }, '429': { description: 'Rate limited' } } } },
    '/admin/auth/verify-otp': { post: { summary: 'Verify an admin login code and start a session', responses: { '200': { description: 'Session cookie set' }, '401': { description: 'Invalid or expired code' } } } },
    '/admin/deals/{id}/decision': { post: { summary: 'Approve or reject a deal with a required reason', security: [{ adminSessionCookie: [] }], responses: { '200': { description: 'Decision recorded and audited' }, '403': { description: 'Admin session with deal-moderation permission required' } } } },
    '/admin/businesses/{id}/decision': { post: { summary: 'Verify, reject, suspend or reinstate a business', security: [{ adminSessionCookie: [] }], responses: { '200': { description: 'Decision recorded and audited' } } } },
    '/admin/businesses/{id}/plan': { post: { summary: 'Assign a business to a pricing plan and subscription status', security: [{ adminSessionCookie: [] }], responses: { '200': { description: 'Plan assignment recorded and audited' } } } },
    '/admin/plans/{id}': { post: { summary: 'Update a pricing plan (price, features, active state)', security: [{ adminSessionCookie: [] }], responses: { '200': { description: 'Plan updated' } } } },
    '/admin/deals/{id}/sponsor': { post: { summary: 'Toggle sponsored (top-of-search) placement for a deal — only allowed when its business is on an active Pro plan', security: [{ adminSessionCookie: [] }], responses: { '200': { description: 'Sponsorship updated' }, '409': { description: 'Business is not on an active Pro plan' } } } },
    '/admin/announcements': { post: { summary: 'Post a message (optionally templated from an active deal) to the Telegram announcement channel', security: [{ adminSessionCookie: [] }], responses: { '201': { description: 'Posted and logged' }, '502': { description: 'Telegram delivery failed' } } } },
    '/admin/team': { post: { summary: 'Invite a new admin/manager/accountant account', security: [{ adminSessionCookie: [] }], responses: { '201': { description: 'Admin account created' }, '403': { description: 'SUPER_ADMIN role required' } } } },
    '/admin/team/{id}': { post: { summary: 'Update an admin account (role, status, Telegram chat id)', security: [{ adminSessionCookie: [] }], responses: { '200': { description: 'Admin account updated' }, '403': { description: 'SUPER_ADMIN role required' } } } },
  }, components: { securitySchemes: {
    sessionCookie: { type: 'apiKey', in: 'cookie', name: '__Host-bugunbor_session' },
    adminSessionCookie: { type: 'apiKey', in: 'cookie', name: 'bb_admin_session' },
  } } });
}
