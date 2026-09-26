// Android App Links: https://bugunbor.uz/… links open in our app when the
// site lists the app's signing certificates in /.well-known/assetlinks.json.

export const ANDROID_PACKAGE = 'uz.bugunbor.app';

const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export function assetLinks(fingerprintsCsv: string | undefined) {
  const fingerprints = (fingerprintsCsv ?? '').split(',').map((value) => value.trim().toUpperCase()).filter((value) => FINGERPRINT.test(value));
  if (!fingerprints.length) return [];
  return [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: ANDROID_PACKAGE, sha256_cert_fingerprints: fingerprints } }];
}
