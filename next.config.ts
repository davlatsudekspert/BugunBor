import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Camera: cashiers scan customer QR codes on /business/redeem.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self)' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  async headers() {
    // vinext's '/:path*' does not match the root, so '/' is listed on its own.
    return [
      { source: '/', headers: securityHeaders },
      { source: '/:path*', headers: securityHeaders },
    ];
  },
};

export default nextConfig;
