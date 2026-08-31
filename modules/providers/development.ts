import type { NfcStoreIntegrationProvider, PaymentProvider, SmsOtpProvider } from './contracts';

function assertDevelopment() {
  if (process.env.NODE_ENV === 'production') throw new Error('DEVELOPMENT_ADAPTER_DISABLED_IN_PRODUCTION');
}

export const developmentSmsProvider: SmsOtpProvider = {
  async sendOtp() { assertDevelopment(); return { providerMessageId: `dev_sms_${crypto.randomUUID()}`, acceptedAt: new Date().toISOString() }; },
};

export const developmentPaymentProvider: PaymentProvider = {
  async createPayment() { assertDevelopment(); throw new Error('DEV_PAYMENT_NEVER_SIMULATES_SUCCESS'); },
  async verifyPayment() { assertDevelopment(); return 'FAILED'; },
};

export const developmentNfcStoreProvider: NfcStoreIntegrationProvider = {
  getAuthorizationUrl() { assertDevelopment(); throw new Error('DEV_NFCSTORE_HAS_NO_REAL_AUTHORIZATION_URL'); },
  async exchangeCode() { assertDevelopment(); throw new Error('DEV_NFCSTORE_NEVER_ISSUES_REAL_TOKENS'); },
  async verifyMembership() { assertDevelopment(); return { verified: false, membership: null, cardStatus: null }; },
};
