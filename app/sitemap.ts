import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap { const base = 'https://bugunbor.uz'; return ['/', '/discover', '/categories', '/business', '/nfcstore', '/contact', '/rules'].map((path) => ({ url: `${base}${path}`, changeFrequency: path === '/discover' ? 'hourly' as const : 'weekly' as const, priority: path === '/' ? 1 : 0.7 })); }
