import { describe, expect, it } from 'vitest';

import { extractLinkToken } from './link-token';

describe('extractLinkToken', () => {
  it('extracts the token from a valid /start link_<token> command', () => {
    expect(extractLinkToken('/start link_abc123XYZ-_')).toBe('abc123XYZ-_');
  });

  it('tolerates surrounding whitespace', () => {
    expect(extractLinkToken('  /start link_abc123  ')).toBe('abc123');
  });

  it('returns null for a plain /start with no payload', () => {
    expect(extractLinkToken('/start')).toBeNull();
  });

  it('returns null for /start with an unrelated payload', () => {
    expect(extractLinkToken('/start something_else')).toBeNull();
  });

  it('returns null for ordinary chat text', () => {
    expect(extractLinkToken('salom')).toBeNull();
  });

  it('returns null for empty or missing text', () => {
    expect(extractLinkToken('')).toBeNull();
    expect(extractLinkToken(undefined)).toBeNull();
    expect(extractLinkToken(null)).toBeNull();
  });
});
