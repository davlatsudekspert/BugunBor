import type { MetadataRoute } from 'next';

import { getConfig } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/account', '/admin', '/business/', '/api/', '/login', '/lang/', '/r/'],
      },
    ],
    sitemap: `${getConfig().appUrl ?? 'https://bugunbor.uz'}/sitemap.xml`,
  };
}
