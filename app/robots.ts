import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/account', '/admin', '/business/', '/api/', '/login', '/lang/', '/r/'],
      },
    ],
    sitemap: 'https://bugunbor.uz/sitemap.xml',
  };
}
