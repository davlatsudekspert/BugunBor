import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainError } from '@/modules/errors';

const state = vi.hoisted(() => ({
  legacy: 'test-legacy-key-unchanged-for-redemptions',
  dedicated: null as string | null,
  setup: vi.fn(), verify: vi.fn(), recovery: vi.fn(), hashIp: vi.fn(),
}));
vi.mock('@/db/client', () => ({ getDb: async () => ({}) }));
vi.mock('@/lib/env', () => ({ getConfig: () => ({ hashSecret: state.legacy, adminMfaSecret: state.dedicated }) }));
vi.mock('@/modules/auth/api-user', () => ({ apiUser: async () => ({ id: 'owner' }) }));
vi.mock('@/modules/auth/admin-mfa', () => ({
  assertAdminOwner: vi.fn(),
  beginAdminSetup: state.setup,
  verifyAdminFactor: state.verify,
  verifyAdminRecovery: state.recovery,
  adminSessionVerified: async () => false,
  factorEnabled: async () => false,
}));
vi.mock('@/modules/rate-limit', () => ({ hashIp: state.hashIp }));
import { POST } from './route';

const request = (body: unknown) => new Request('https://bugunbor.uz/api/v1/auth/admin-mfa', {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'https://bugunbor.uz', 'cf-connecting-ip': '192.0.2.10' },
  body: JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks();
  state.dedicated = null;
  state.hashIp.mockResolvedValue('ip-hash');
  state.setup.mockResolvedValue({ uri: 'test-setup-uri' });
  state.verify.mockResolvedValue({ recoveryCodes: [] });
});

describe('dedicated Authenticator encryption key', () => {
  it('uses the dedicated key for enrollment without changing IP/redemption secret selection', async () => {
    state.dedicated = 'test-only-dedicated-mfa-key-at-least-32-characters';
    expect((await POST(request({ action: 'setup' }))).status).toBe(200);
    expect(state.setup).toHaveBeenCalledWith({}, { id: 'owner' }, state.dedicated, 'ip-hash');
    expect(state.hashIp).toHaveBeenCalledWith('192.0.2.10', state.legacy);
  });
  it('uses the same dedicated key when verifying the Authenticator code', async () => {
    state.dedicated = 'test-only-dedicated-mfa-key-at-least-32-characters';
    expect((await POST(request({ action: 'verify', code: '123456' }))).status).toBe(200);
    expect(state.verify).toHaveBeenCalledWith({}, { id: 'owner' }, '123456', state.dedicated, 'ip-hash');
  });
  it('preserves existing HASH_SECRET enrollments when no dedicated key is set', async () => {
    expect((await POST(request({ action: 'setup' }))).status).toBe(200);
    expect(state.setup).toHaveBeenCalledWith({}, { id: 'owner' }, state.legacy, 'ip-hash');
    expect((await POST(request({ action: 'verify', code: '123456' }))).status).toBe(200);
    expect(state.verify).toHaveBeenCalledWith({}, { id: 'owner' }, '123456', state.legacy, 'ip-hash');
  });
  it('does not silently fall back when an invalid dedicated key was explicitly set', async () => {
    state.dedicated = 'short';
    state.setup.mockRejectedValueOnce(new DomainError('SERVER', 503));
    // The service owns key validation; the route must pass the selected key unchanged.
    const response = await POST(request({ action: 'setup' }));
    expect(response.status).toBe(503);
    expect(state.setup).toHaveBeenCalledWith({}, { id: 'owner' }, 'short', 'ip-hash');
  });
  it('rejects cross-origin setup before reaching enrollment', async () => {
    const req = request({ action: 'setup' });
    req.headers.set('origin', 'https://other.example');
    expect((await POST(req)).status).toBe(403);
    expect(state.setup).not.toHaveBeenCalled();
  });
});
