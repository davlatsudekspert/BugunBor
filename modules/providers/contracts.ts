export type DeliveryResult = { providerMessageId: string; acceptedAt: string };

export interface SmsOtpProvider { sendOtp(input: { phone: string; code: string; expiresAt: string }): Promise<DeliveryResult>; }
export interface EmailProvider { send(input: { to: string; template: string; variables: Record<string, string> }): Promise<DeliveryResult>; }
export interface PaymentProvider { createPayment(input: { idempotencyKey: string; amountUzs: number; referenceId: string }): Promise<{ externalId: string; checkoutUrl: string }>; verifyPayment(externalId: string): Promise<'PENDING' | 'PAID' | 'FAILED'>; }
export interface MapsProvider { geocode(input: { address: string; city: string }): Promise<{ latitude: number; longitude: number }>; }
export interface ObjectStorageProvider { createUpload(input: { key: string; contentType: string; sizeBytes: number }): Promise<{ uploadUrl: string; expiresAt: string }>; }
export interface PushNotificationProvider { send(input: { userId: string; title: string; body: string; deepLink?: string }): Promise<DeliveryResult>; }
export interface NfcStoreIntegrationProvider { getAuthorizationUrl(input: { state: string; codeChallenge: string }): string; exchangeCode(input: { code: string; codeVerifier: string }): Promise<{ subject: string; scopes: string[]; expiresAt: string }>; verifyMembership(subject: string): Promise<{ verified: boolean; membership: string | null; cardStatus: string | null }>; }
/** See modules/providers/telegram.ts — used for admin login codes rather than an SMS gateway. */
export interface TelegramLoginCodeProvider { sendLoginCode(input: { chatId: string; code: string; expiresInMinutes: number }): Promise<{ ok: true } | { ok: false; error: string }>; }
