import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const base = site.url.replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Search result pages are thin duplicates; keep them out of the index.
        disallow: ['/search/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
