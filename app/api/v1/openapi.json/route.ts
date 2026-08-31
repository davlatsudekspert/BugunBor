import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    openapi: '3.1.0',
    info: {
      title: 'BugunBor API',
      version: '1.0.0-phase1',
      description:
        'Mobile and NFCStore integration boundary. All timestamps are UTC.',
    },
    servers: [{ url: '/api/v1' }],
    paths: {
      '/deals': {
        get: {
          summary: 'List active deals',
          parameters: [
            { name: 'city', in: 'query', schema: { type: 'string' } },
            { name: 'q', in: 'query', schema: { type: 'string' } },
            {
              name: 'type',
              in: 'query',
              schema: { type: 'string', enum: ['PRODUCT', 'SERVICE'] },
            },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'lat', in: 'query', schema: { type: 'number' } },
            { name: 'lng', in: 'query', schema: { type: 'number' } },
            { name: 'radiusKm', in: 'query', schema: { type: 'number' } },
          ],
          responses: { '200': { description: 'Active deals' } },
        },
        post: {
          summary:
            'Create a PRODUCT (quantity) or SERVICE (time slots) deal for a business the caller belongs to; always lands PENDING_REVIEW',
          responses: {
            '201': { description: 'Created, pending moderation' },
            '403': { description: 'Not a member of the business' },
          },
        },
      },
      '/deals/{id}': {
        patch: {
          summary:
            'Edit a deal, subject to the lifecycle edit-lock policy (free before ACTIVE, price-down/quantity-up/end-early only once ACTIVE)',
          responses: {
            '200': { description: 'Updated' },
            '409': { description: 'Rejected by the edit-lock policy' },
          },
        },
        delete: {
          summary: 'Delete a deal that has not gone ACTIVE yet',
          responses: {
            '200': { description: 'Archived' },
            '409': { description: 'Deal has already launched' },
          },
        },
      },
      '/deals/{id}/stop': {
        post: {
          summary: 'End an ACTIVE deal early',
          responses: {
            '200': { description: 'Stopped' },
            '409': { description: 'Deal is not currently ACTIVE' },
          },
        },
      },
      '/deals/{id}/redemptions': {
        post: {
          summary:
            'Claim an active PRODUCT deal, or reserve a `slotId` on an active SERVICE deal, atomically',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
            {
              name: 'Idempotency-Key',
              in: 'header',
              required: true,
              schema: { type: 'string', minLength: 12 },
            },
          ],
          responses: {
            '201': { description: 'Claimed' },
            '409': {
              description: 'Expired, sold out, limit, or concurrency conflict',
            },
          },
        },
      },
      '/admin/scheduler/tick': {
        post: {
          summary:
            'Drive the Auto Scheduler: SCHEDULED->ACTIVE, ACTIVE->EXPIRED, ACTIVE->SOLD_OUT',
          responses: {
            '200': { description: 'Tick applied' },
            '403': {
              description: 'ADMIN/SUPER_ADMIN session or CRON_SECRET required',
            },
          },
        },
      },
      '/businesses': {
        post: {
          summary: 'Submit business onboarding',
          responses: {
            '201': { description: 'Pending moderation' },
            '401': { description: 'Authentication required' },
          },
        },
      },
      '/moderation/deals/{id}/decision': {
        post: {
          summary: 'Approve or reject a deal with a required reason',
          responses: {
            '200': { description: 'Decision recorded and audited' },
            '403': { description: 'Moderator role required' },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        sessionCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: '__Host-bugunbor_session',
        },
      },
    },
  });
}
