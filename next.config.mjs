import redirects from './content/redirects.json' with { type: 'json' };

/** @type {import('next').NextConfig} */
const nextConfig = {
  // WordPress served every URL with a trailing slash. Keeping this true is what
  // makes /2025/06/07/how-to-enable-negotiation-feature/ resolve identically to
  // the old site instead of 308-redirecting to a slashless variant.
  trailingSlash: true,

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
