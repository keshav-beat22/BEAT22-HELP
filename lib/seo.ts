import type { Metadata } from 'next';
import { site } from './site';
import type { Post, Category } from './posts';

/**
 * Yoast stored titles as templates like "%%title%% %%page%% %%sitename%%".
 * Expand them the way Yoast would have, then normalise the result.
 *
 * The raw expansion produced "How to enable negotiation feature? Beat22",
 * and Next then appended its own "| Beat22" template on top, so every article
 * and category title shipped the brand name twice. These titles are now
 * emitted as `absolute` so Next leaves them alone, and the brand is appended
 * here exactly once, with a separator.
 */
export function expandYoastTitle(template: string, title: string): string {
  const base = template
    ? template
        .replace(/%%title%%/g, title)
        .replace(/%%sitename%%/g, '')
        .replace(/%%sitedesc%%/g, '')
        .replace(/%%page%%/g, '')
        .replace(/%%sep%%/g, '|')
        .replace(/\s*\|\s*$/, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
    : title;

  const clean = base || title;
  // Never let the brand appear twice, however the template was written.
  const withoutBrand = clean
    .replace(new RegExp(`\\s*\\|?\\s*${site.name}\\s*$`, 'i'), '')
    .trim();

  return `${withoutBrand || title} | ${site.name}`;
}

/** Social image for a page, falling back to the branded default card. */
function socialImage(image?: string) {
  if (image) return [{ url: absoluteUrl(image), alt: site.name }];
  return [
    {
      url: absoluteUrl(site.ogImage.src),
      width: site.ogImage.width,
      height: site.ogImage.height,
      alt: site.ogImage.alt,
    },
  ];
}

export function absoluteUrl(pathname: string): string {
  const base = site.url.replace(/\/$/, '');
  return `${base}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

/** Metadata for a single help article. */
export function postMetadata(post: Post): Metadata {
  const title = expandYoastTitle(post.seoTitle, post.title);
  const url = absoluteUrl(post.urlPath);
  const images = socialImage(post.featuredImage);

  return {
    // absolute: the brand is already in `title`; without this Next appends
    // its layout template and the name lands twice.
    title: { absolute: title },
    description: post.description,
    keywords: post.focusKeyword ? [post.focusKeyword] : undefined,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title,
      description: post.description,
      url,
      siteName: site.name,
      locale: site.locale,
      publishedTime: toIso(post.date),
      modifiedTime: toIso(post.modified),
      section: post.categories[0],
      tags: [...post.tags],
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: post.description,
      images: images.map((i) => i.url),
    },
  };
}

export function categoryMetadata(category: Category): Metadata {
  const title = `${category.name} | ${site.name}`;
  const url = absoluteUrl(`/category/${category.slug}/`);
  const description =
    category.description ||
    `Help articles about ${category.name.toLowerCase()} on ${site.name}.`;
  const images = socialImage();

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      siteName: site.name,
      locale: site.locale,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.map((i) => i.url),
    },
  };
}

export function pageMetadata(opts: {
  title: string;
  description: string;
  pathname: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const url = absoluteUrl(opts.pathname);
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    robots: opts.noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'website',
      title: opts.title,
      description: opts.description,
      url,
      siteName: site.name,
      locale: site.locale,
      images: socialImage(opts.image),
    },
    twitter: {
      card: 'summary_large_image',
      title: opts.title,
      description: opts.description,
      images: socialImage(opts.image).map((i) => i.url),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Structured data                                                            */
/* -------------------------------------------------------------------------- */

export function organisationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${site.url}/#organization`,
    name: site.name,
    url: 'https://beat22.com',
    description: site.description,
    logo: {
      '@type': 'ImageObject',
      '@id': `${site.url}/#logo`,
      url: absoluteUrl(site.logo.src),
      width: site.logo.width,
      height: site.logo.height,
      caption: site.name,
    },
    image: { '@id': `${site.url}/#logo` },
    // Omitted entirely when no profiles are configured: an empty or wrong
    // sameAs is worse for entity matching than none at all.
    ...(site.social.length ? { sameAs: [...site.social] } : {}),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: site.supportWhatsApp,
      availableLanguage: ['English'],
    },
  };
}

export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    url: site.url,
    name: site.title,
    description: site.description,
    publisher: { '@id': `${site.url}/#organization` },
    inLanguage: site.language,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${site.url}/search/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * A WebPage node per page. Search engines use it to connect the page to the
 * site, its breadcrumb trail and its primary image, rather than leaving the
 * article node floating on its own.
 */
export function webPageSchema(opts: {
  pathname: string;
  name: string;
  description: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
}) {
  const url = absoluteUrl(opts.pathname);
  return {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: opts.name,
    description: opts.description,
    isPartOf: { '@id': `${site.url}/#website` },
    inLanguage: site.language,
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: absoluteUrl(opts.image ?? site.ogImage.src),
    },
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
    breadcrumb: { '@id': `${url}#breadcrumb` },
    potentialAction: {
      '@type': 'ReadAction',
      target: [url],
    },
  };
}

/**
 * Articles in a help centre are better described as TechArticle than the
 * generic Article that Yoast emitted — it is eligible for richer treatment
 * in search results and states the support intent explicitly.
 */
export function articleSchema(post: Post) {
  return {
    '@type': 'TechArticle',
    '@id': `${absoluteUrl(post.urlPath)}#article`,
    headline: post.title,
    description: post.description,
    datePublished: toIso(post.date),
    dateModified: toIso(post.modified),
    inLanguage: site.language,
    articleSection: post.categories[0],
    keywords: post.focusKeyword || undefined,
    image: post.featuredImage ? absoluteUrl(post.featuredImage) : undefined,
    author: { '@id': `${site.url}/#organization` },
    publisher: { '@id': `${site.url}/#organization` },
    isPartOf: { '@id': `${absoluteUrl(post.urlPath)}#webpage` },
    mainEntityOfPage: { '@id': `${absoluteUrl(post.urlPath)}#webpage` },
    // Nothing here sits behind a login or paywall.
    isAccessibleForFree: true,
  };
}

export function breadcrumbSchema(
  crumbs: { name: string; item?: string }[],
  pathname?: string,
) {
  return {
    '@type': 'BreadcrumbList',
    ...(pathname ? { '@id': `${absoluteUrl(pathname)}#breadcrumb` } : {}),
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.item ? { item: absoluteUrl(c.item) } : {}),
    })),
  };
}

/**
 * Many of these articles are literally questions ("How do I get paid?").
 * Emitting FAQPage for them is what makes a help centre eligible for
 * question-style rich results, which WordPress was not doing here.
 */
export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.question,
      acceptedAnswer: { '@type': 'Answer', text: i.answer },
    })),
  };
}

export function collectionSchema(opts: {
  name: string;
  description: string;
  pathname: string;
  items: { name: string; url: string }[];
}) {
  return {
    '@type': 'CollectionPage',
    '@id': `${absoluteUrl(opts.pathname)}#collection`,
    name: opts.name,
    description: opts.description,
    url: absoluteUrl(opts.pathname),
    isPartOf: { '@id': `${site.url}/#website` },
    inLanguage: site.language,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: opts.items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.name,
        url: absoluteUrl(it.url),
      })),
    },
  };
}

/** Wraps any set of schema nodes into a single @graph document. */
export function graph(...nodes: object[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean),
  };
}

function toIso(wpDate: string): string {
  if (!wpDate) return '';
  // WordPress exports "2025-06-07 10:41:57" in site-local time.
  return new Date(wpDate.replace(' ', 'T') + 'Z').toISOString();
}
