import path from 'node:path';
import { fileURLToPath } from 'node:url';

import redirects from './content/redirects.json' with { type: 'json' };

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // A stray package-lock.json in the home directory made Next infer
  // /Users/<you> as the workspace root, which breaks module tracing and the
  // Vercel build. Pin it to this project.
  outputFileTracingRoot: projectRoot,

  // not-found.tsx lists recent articles, so any route that can 404 at request
  // time needs the content files in its bundle. Pages that read content at
  // build time get it traced automatically; the admin route does not, which
  // left its 404 showing "No articles here yet" while the normal 404 showed
  // the full list.
  outputFileTracingIncludes: {
    '/**': ['./content/**/*'],
  },

  // WordPress served every URL with a trailing slash. Keeping this true is what
  // makes /2025/06/07/how-to-enable-negotiation-feature/ resolve identically to
  // the old site instead of 308-redirecting to a slashless variant.
  trailingSlash: true,

  // Next's own trailing-slash redirect would append a slash to the Keystatic
  // admin routes, which its client router cannot match. middleware.ts applies
  // the rule per path instead: slash for the public site, none for the admin.
  skipTrailingSlashRedirect: true,

  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    // Media is served from public/images, already sized by WordPress.
    formats: ['image/avif', 'image/webp'],
  },

  async redirects() {
    return [
      // Historical slugs that WordPress was redirecting via _wp_old_slug.
      ...redirects,

      // WordPress search lived at /?s=term. Preserve any inbound links to it.
      {
        source: '/',
        has: [{ type: 'query', key: 's', value: '(?<term>.*)' }],
        destination: '/search/?q=:term',
        permanent: true,
      },

      // Legacy feed and author endpoints no longer exist.
      { source: '/feed/', destination: '/', permanent: true },
      { source: '/author/:slug/', destination: '/', permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            // Deliberately narrow. A script-src directive would need nonces
            // for the inline scripts Next emits, and getting that wrong breaks
            // the whole page; these three are unambiguous and cost nothing.
            //   frame-ancestors  clickjacking, and supersedes X-Frame-Options
            //   object-src       kills <object>/<embed> plugin vectors
            //   base-uri         stops an injected <base> retargeting links
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
          },
        ],
      },
      {
        // Media never changes once published; let the CDN keep it.
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
