import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';
import SiteChrome from '@/components/SiteChrome';
import { Analytics } from '@vercel/analytics/next';
import { site } from '@/lib/site';
import { graph, organisationSchema, websiteSchema } from '@/lib/seo';
import { getPopulatedCategories } from '@/lib/posts';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    // Matches the Yoast pattern "%%title%% %%sitename%%"
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  referrer: 'strict-origin-when-cross-origin',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    // The .ico is listed first and is what Google's search-result favicon
    // crawler picks up; the PNGs are what browsers actually render.
    icon: [
      { url: site.faviconIco, sizes: '16x16 32x32 48x48' },
      { url: site.faviconSmall, type: 'image/png', sizes: '32x32' },
      { url: site.favicon, type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: site.appleIcon, sizes: '180x180' }],
  },
  alternates: { canonical: `${site.url}/` },
  openGraph: {
    type: 'website',
    siteName: site.name,
    locale: site.locale,
    url: site.url,
    title: site.title,
    description: site.description,
    images: [
      {
        url: `${site.url}${site.ogImage.src}`,
        width: site.ogImage.width,
        height: site.ogImage.height,
        alt: site.ogImage.alt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
    images: [`${site.url}${site.ogImage.src}`],
  },
  // Stops iOS Safari turning article numbers into phone links.
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport = {
  themeColor: '#1e1e1e',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // A server component, so the category list can be read at build time and
  // handed to the header's client-side search.
  const categories = getPopulatedCategories();

  return (
    <html lang="en">
      <body>
        <SiteChrome>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <JsonLd data={graph(organisationSchema(), websiteSchema())} />
          <Header categories={categories} />
        </SiteChrome>
        <main id="main" className="site-main">
          {children}
        </main>
        <SiteChrome>
          <Footer />
          {/* Inside SiteChrome so the admin does not spend page views from
              the Hobby plan's 50,000/month, and so internal editing is not
              mixed into the public traffic figures. Cookieless, so it needs
              no consent banner. */}
          <Analytics />
        </SiteChrome>
      </body>
    </html>
  );
}
