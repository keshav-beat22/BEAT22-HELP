/**
 * Values ported from the WordPress install so the new site matches exactly.
 * Sources are noted per field in case anything needs verifying later.
 */

export const site = {
  // wp_options.blogname / siteurl
  name: 'Beat22',
  title: 'Help Centre | Beat22',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://help.beat22.com',
  locale: 'en_US',
  language: 'en-US',

  /**
   * Horizontal wordmark. viewBox is 1129.13 x 373.02, so the intrinsic ratio
   * is 3.027:1 — at 32px tall it renders about 97px wide. Height is what the
   * CSS constrains; width follows, so the ratio can never be forced.
   */
  logo: {
    src: '/images/brand/beat22-logo.svg',
    alt: 'Beat22',
    width: 1129,
    height: 373,
  },

  /**
   * One-line description reused for the home page meta description, the
   * Organization schema and the default social card.
   */
  description:
    'Answers and step-by-step guides for buying and selling beats on Beat22 — licensing, payments, orders, uploads and payouts.',

  /**
   * Default social card, 1200x630. Used by any page that has no image of its
   * own, so every share renders with branded artwork instead of a bare link.
   */
  ogImage: {
    src: '/images/brand/og-default.jpg',
    width: 1200,
    height: 630,
    alt: 'Beat22 Help Centre',
  },

  /**
   * Profiles emitted as Organization.sameAs, which is how search engines tie
   * this domain to the rest of the brand.
   */
  social: [
    'https://www.facebook.com/Beat22app',
    'https://www.instagram.com/beat22__',
    'https://x.com/beat22__',
    'https://www.youtube.com/@beat22app',
    'https://www.linkedin.com/company/beat22/',
  ] as readonly string[],

  /** Support contact surfaced in the Organization schema. */
  supportWhatsApp: 'https://wa.me/919872066692',

  favicon: '/images/2025/07/cropped-Beat22-Logo-ICO-25-scaled-1-192x192.png',
  appleIcon: '/images/2025/07/cropped-Beat22-Logo-ICO-25-scaled-1-180x180.png',

  // Astra header-html-2: the only item in the header's right zone.
  headerCta: {
    label: 'Go To Beat22',
    href: 'https://beat22.com',
  },

  // Astra footer below-row: the year and company name.
  footer: {
    company: 'Ill People Productions Private Limited',
    copyright: 'All Rights Reserved',
    signUp: { label: 'Sign Up', href: 'https://beat22.com/signup' },
  },

  // Homepage hero, from article-archive.php
  hero: {
    image: '/images/2025/07/blog-top-4-1.png',
    headline: 'How can we help you?',
    searchPlaceholder: 'Search our help center...',
  },

  // Portrait cards, resolved from the ACF fields on the homepage.
  quickLinks: [
    {
      title: 'For Buyers',
      href: '/buyers/',
      image: '/images/2025/07/buyer-scaled.png',
      external: false,
    },
    {
      title: 'For Sellers',
      href: '/sellers/',
      image: '/images/2025/07/seller-scaled.png',
      external: false,
    },
    {
      // This card pointed off-site on the original install. Kept as-is.
      title: 'Blogs',
      href: 'https://blog.beat22.com/',
      image: '/images/2025/07/blog-scaled.png',
      external: true,
    },
  ],
} as const;

/**
 * Footer link columns. Content lives here so changing a link never means
 * touching the component.
 */
export const footerNav = [
  {
    heading: 'Company',
    links: [
      { label: 'Terms & Conditions', href: 'https://beat22.com/terms-conditions' },
      { label: 'Privacy Policy', href: 'https://beat22.com/privacy-policy' },
      { label: 'Contact Us', href: 'https://beat22.com/contact-us' },
      { label: 'About Us', href: 'https://beat22.com/about-us' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { label: 'Sign Up', href: 'https://beat22.com/signup' },
      { label: 'Sign In', href: 'https://beat22.com/signin' },
      { label: 'Start Selling', href: 'https://beat22.com/subscriptions' },
      { label: 'License Blog', href: 'https://beat22.com/lic-blog' },
      { label: 'WhatsApp Support', href: 'https://wa.me/919872066692' },
    ],
  },
  {
    heading: 'Explore',
    links: [
      { label: 'WAV under \u20b9999', href: 'https://beat22.com/latestbeats?wav_under_999=true' },
      { label: 'Wav + Stems under \u20b91,999', href: 'https://beat22.com/latestbeats?wav_stems_1999=true' },
      { label: 'Beat With Exclusive', href: 'https://beat22.com/latestbeats?beats_with_exclusives=true' },
      { label: 'Trending Beats', href: 'https://beat22.com/trending-beats' },
    ],
  },
] as const;

/**
 * Payment marks shown in the footer's fifth column. Each SVG's viewBox ratio
 * is preserved; the tile sizes them, so only the source and label live here.
 */
/**
 * Footer social row. `href` values are the same URLs emitted as
 * Organization.sameAs, kept in `site.social` so the two can never drift.
 * `icon` names map to the inline SVG paths in components/SocialLinks.tsx.
 */
export const socialLinks = [
  { label: 'Facebook', icon: 'facebook', href: 'https://www.facebook.com/Beat22app' },
  { label: 'Instagram', icon: 'instagram', href: 'https://www.instagram.com/beat22__' },
  { label: 'X', icon: 'x', href: 'https://x.com/beat22__' },
  { label: 'YouTube', icon: 'youtube', href: 'https://www.youtube.com/@beat22app' },
  { label: 'LinkedIn', icon: 'linkedin', href: 'https://www.linkedin.com/company/beat22/' },
] as const;

export const paymentIcons = [
  { src: '/images/brand/credit-card-icon.svg', alt: 'Mastercard' },
  { src: '/images/brand/upi-payment-icon.svg', alt: 'UPI' },
  { src: '/images/brand/discover-card-icon.svg', alt: 'Discover' },
  { src: '/images/brand/online-card.svg', alt: 'Online card payment' },
  { src: '/images/brand/visa-icon.svg', alt: 'Visa' },
  { src: '/images/brand/american-card-icon.svg', alt: 'American Express' },
] as const;

/**
 * Astra Customizer colours. Kept as tokens so the palette lives in one place.
 */
export const colors = {
  background: '#1e1e1e',
  headerBackground: '#1e1e1e',
  footerBackground: '#240f34',
  surface: '#282828',
  surfaceHover: '#303030',
  text: '#e2e2e2',
  textOnDark: '#ffffff',
  accent: '#ef88ff',
  mobileToggle: '#f2f2f2',
  categoryGradient: 'linear-gradient(45deg, #392275, #542572)',
  ctaGradient:
    'linear-gradient(169deg, #7000FF 0%, #7A00FF 31.77%, #8F00FF 100%)',
} as const;

/**
 * Categories excluded from the homepage grid, matching the
 * $excluded_categories array in article-archive.php.
 */
export const excludedFromHomeGrid = ['uncategorized', 'buyer', 'seller'];
