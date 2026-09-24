import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';
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
    icon: site.favicon,
    apple: site.appleIcon,
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
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <JsonLd data={graph(organisationSchema(), websiteSchema())} />
        <Header categories={categories} />
        <main id="main" className="site-main">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
