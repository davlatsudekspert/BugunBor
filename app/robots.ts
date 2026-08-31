import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots { return { rules: [{ userAgent: '*', allow: ['/', '/discover', '/categories', '/business', '/nfcstore', '/deals/', '/rules'], disallow: ['/account/', '/admin/', '/business/dashboard', '/business/deals', '/api/'] }], sitemap: 'https://bugunbor.uz/sitemap.xml' }; }
