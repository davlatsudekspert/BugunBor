import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ openapi: '3.1.0', info: { title: 'BugunBor API', version: '1.0.0-phase1', description: 'Mobile and NFCStore integration boundary. All timestamps are UTC.' }, servers: [{ url: '/api/v1' }], paths: {
    '/deals': { get: { summary: 'List active deals', parameters: [{ name: 'city', in: 'query', schema: { type: 'string' } }, { name: 'q', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Active deals' } } } },
    '/deals/{id}/redemptions': { post: { summary: 'Claim an active deal atomically', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', minLength: 12 } }], responses: { '201': { description: 'Claimed' }, '409': { description: 'Expired, sold out, limit, or concurrency conflict' } } } },
    '/businesses': { post: { summary: 'Submit business onboarding', responses: { '201': { description: 'Pending moderation' }, '401': { description: 'Authentication required' } } } },
    '/admin/auth/request-otp': { post: { summary: 'Request an admin login code over Telegram', responses: { '200': { description: 'Code sent if the phone is a registered admin (response is generic either way)' }, '429': { description: 'Rate limited' } } } },
    '/admin/auth/verify-otp': { post: { summary: 'Verify an admin login code and start a session', responses: { '200': { description: 'Session cookie set' }, '401': { description: 'Invalid or expired code' } } } },
    '/admin/deals/{id}/decision': { post: { summary: 'Approve or reject a deal with a required reason', security: [{ adminSessionCookie: [] }], responses: { '200': { description: 'Decision recorded and audited' }, '403': { description: 'Admin session with deal-moderation permission required' } } } },
    '/admin/businesses/{id}/decision': { post: { summary: 'Verify, reject, suspend or reinstate a business', security: [{ adminSessionCookie: [] }], responses: { '200': { description: 'Decision recorded and audited' } } } },
    '/admin/businesses/{id}/plan': { post: { summary: 'Assign a business to a pricing plan and subscription status', security: [{ adminSessionCookie: [] }], responses: { '200': { description: 'Plan assignment recorded and audited' } } } },
    '/admin/plans/{id}': { post: { summary: 'Update a pricing plan (price, features, active state)', security: [{ adminSessionCookie: [] }], responses: { '200': { description: 'Plan updated' } } } },
    '/admin/team': { post: { summary: 'Invite a new admin/manager/accountant account', security: [{ adminSessionCookie: [] }], responses: { '201': { description: 'Admin account created' }, '403': { description: 'SUPER_ADMIN role required' } } } },
    '/admin/team/{id}': { post: { summary: 'Update an admin account (role, status, Telegram chat id)', security: [{ adminSessionCookie: [] }], responses: { '200': { description: 'Admin account updated' }, '403': { description: 'SUPER_ADMIN role required' } } } },
  }, components: { securitySchemes: {
    sessionCookie: { type: 'apiKey', in: 'cookie', name: '__Host-bugunbor_session' },
    adminSessionCookie: { type: 'apiKey', in: 'cookie', name: 'bb_admin_session' },
  } } });
}
