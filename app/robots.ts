import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots { return { rules: [{ userAgent: '*', allow: ['/', '/discover', '/categories', '/business', '/nfcstore', '/deals/'], disallow: ['/account/', '/admin/', '/business/dashboard', '/api/'] }], sitemap: 'https://bugunbor.uz/sitemap.xml' }; }
