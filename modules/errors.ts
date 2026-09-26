import type { ErrorCode } from '@/lib/i18n';

const defaultStatus: Partial<Record<ErrorCode, number>> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  CSRF: 403,
  ACCOUNT_BLOCKED: 403,
  VALIDATION: 422,
  CONSENT_REQUIRED: 422,
  NOT_FOUND: 404,
  CODE_NOT_FOUND: 404,
  USER_NOT_FOUND: 404,
  RATE_LIMITED: 429,
  SERVER: 500,
  TELEGRAM_NOT_CONFIGURED: 503,
  WEBHOOK_FAILED: 502,
};

/** An expected business-rule failure with a translatable code. */
export class DomainError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    status?: number,
    readonly detail?: Record<string, string | number>,
  ) {
    super(code);
    this.name = 'DomainError';
    this.status = status ?? defaultStatus[code] ?? 409;
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
