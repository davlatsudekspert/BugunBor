import { describe, expect, it } from 'vitest';

import { isStartCommand } from './telegram-commands';

describe('isStartCommand', () => {
  it('matches a bare /start', () => {
    expect(isStartCommand('/start')).toBe(true);
  });

  it('matches /start with a payload', () => {
    expect(isStartCommand('/start something')).toBe(true);
  });

  it('matches /start@BotUsername (how group/deep-link starts often arrive)', () => {
    expect(isStartCommand('/start@bugunborbot')).toBe(true);
  });

  it('tolerates surrounding whitespace', () => {
    expect(isStartCommand('  /start  ')).toBe(true);
  });

  it('rejects ordinary chat text', () => {
    expect(isStartCommand('salom')).toBe(false);
  });

  it('rejects a command that merely starts with /start as a prefix of another word', () => {
    expect(isStartCommand('/startsomething')).toBe(false);
  });

  it('rejects empty or missing text', () => {
    expect(isStartCommand('')).toBe(false);
    expect(isStartCommand(undefined)).toBe(false);
    expect(isStartCommand(null)).toBe(false);
  });
});
