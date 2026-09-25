// A compact description of the public API for the mobile apps and partners.
const error = { description: 'Error: { error: { code, message, fields? } } with a localized message' };

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'BugunBor API',
    version: '1.0.0',
    description: 'Nearby, time-limited deals in Uzbekistan. Times are UTC "YYYY-MM-DD HH:MM:SS"; prices are integer so‘m. Writes require a same-origin request and the session cookie.',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: { session: { type: 'apiKey', in: 'cookie', name: 'bb_session' } },
  },
  paths: {
    '/deals': {
      get: {
        summary: 'Live deals',
        parameters: [
          { name: 'city', in: 'query', schema: { type: 'string', example: 'tashkent' } },
          { name: 'category', in: 'query', schema: { type: 'string', example: 'taomlar' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['ending', 'discount', 'new', 'near'] } },
          { name: 'lat', in: 'query', schema: { type: 'number' } },
          { name: 'lng', in: 'query', schema: { type: 'number' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', maximum: 50, default: 24 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: { '200': { description: '{ data: Deal[], page: { total, offset, limit } }' }, '422': error },
      },
    },
    '/deals/{id}/redemptions': {
      post: {
        summary: 'Claim a deal and receive a one-time code',
        security: [{ session: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', minLength: 12 } },
        ],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { branchId: { type: 'string' } }, required: ['branchId'] } } } },
        responses: { '201': { description: '{ data: { id, code, expiresAt } }' }, '401': error, '409': error, '422': error },
      },
    },
    '/redemptions/{id}/cancel': { post: { summary: 'Cancel an active code', security: [{ session: [] }], responses: { '200': { description: 'Cancelled' }, '409': error } } },
    '/favorites/{dealId}': {
      put: { summary: 'Save a deal', security: [{ session: [] }], responses: { '200': { description: 'Saved' } } },
      delete: { summary: 'Unsave a deal', security: [{ session: [] }], responses: { '200': { description: 'Removed' } } },
    },
    '/follows/{businessId}': {
      put: { summary: 'Follow a business (new deals arrive in Telegram)', security: [{ session: [] }], responses: { '200': { description: '{ data: { following, followers } }' } } },
      delete: { summary: 'Unfollow a business', security: [{ session: [] }], responses: { '200': { description: '{ data: { following, followers } }' } } },
    },
    '/reviews': {
      post: {
        summary: 'Rate a redeemed visit (once, within 30 days)',
        security: [{ session: [] }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { redemptionId: { type: 'string' }, rating: { type: 'integer', minimum: 1, maximum: 5 }, comment: { type: 'string', maxLength: 500 } }, required: ['redemptionId', 'rating'] } } } },
        responses: { '201': { description: 'Saved' }, '403': error, '409': error },
      },
    },
    '/me': {
      patch: { summary: 'Update name or notification settings', security: [{ session: [] }], responses: { '200': { description: 'Updated' } } },
      delete: { summary: 'Delete the account', security: [{ session: [] }], responses: { '200': { description: 'Deleted' } } },
    },
    '/auth/telegram/start': { post: { summary: 'Start a Telegram login', responses: { '201': { description: '{ data: { deepLink, matchCode, expiresAt } }; sets a short-lived login cookie' } } } },
    '/auth/telegram/status': { get: { summary: 'Poll the Telegram login', responses: { '200': { description: '{ data: { status } }; sets the session cookie once approved' } } } },
  },
};

export function GET() {
  return Response.json(spec, { headers: { 'cache-control': 'public, max-age=3600' } });
}
