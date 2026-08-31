import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ openapi: '3.1.0', info: { title: 'BugunBor API', version: '1.0.0-phase1', description: 'Mobile and NFCStore integration boundary. All timestamps are UTC.' }, servers: [{ url: '/api/v1' }], paths: {
    '/deals': { get: { summary: 'List active deals', parameters: [{ name: 'city', in: 'query', schema: { type: 'string' } }, { name: 'q', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Active deals' } } } },
    '/deals/{id}/redemptions': { post: { summary: 'Claim an active deal atomically', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', minLength: 12 } }], responses: { '201': { description: 'Claimed' }, '409': { description: 'Expired, sold out, limit, or concurrency conflict' } } } },
    '/businesses': { post: { summary: 'Submit business onboarding', responses: { '201': { description: 'Pending moderation' }, '401': { description: 'Authentication required' } } } },
    '/moderation/deals/{id}/decision': { post: { summary: 'Approve or reject a deal with a required reason', responses: { '200': { description: 'Decision recorded and audited' }, '403': { description: 'Moderator role required' } } } },
  }, components: { securitySchemes: { sessionCookie: { type: 'apiKey', in: 'cookie', name: '__Host-bugunbor_session' } } } });
}
