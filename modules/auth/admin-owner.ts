import { sha256Hex } from '@/lib/crypto';

// One approved owner. Keep the actual phone out of this public repository.
const OWNER_PHONE_SHA256 = '691d99e6212dfdd0c686c45358db2eb9392e7adc813e70db39b32b5dc87f0a96';

export async function isOwnerPhone(phone: string | null) {
  return Boolean(phone && await sha256Hex(phone) === OWNER_PHONE_SHA256);
}
