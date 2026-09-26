# SEO

What is in place, where it lives, and what still needs a human.

---

## Everything is driven by `NEXT_PUBLIC_SITE_URL`

Canonicals, Open Graph URLs, the sitemap and every schema `@id` are built from
it. Set it in Vercel to `https://help.beat22.com`. Wrong value here undoes
everything else on this page.

---

## Per-page metadata — `lib/seo.ts`

Every route exports metadata through one of three builders, so no page can
ship without a canonical or a social card.

| Builder | Used by |
|---|---|
| `postMetadata(post)` | Articles |
| `categoryMetadata(category)` | `/category/<slug>/` |
| `pageMetadata({...})` | Home, `/buyers/`, `/sellers/`, `/blogs/`, `/search/` |

Each produces: title, meta description, canonical, Open Graph (type, title,
description, url, image, publish/modify times) and a Twitter summary card.

**Titles carry the brand exactly once.** The WordPress export's Yoast template
expanded to `"… Beat22"` and Next then appended its own `"| Beat22"`, so every
article and category title shipped the name twice. Titles are now emitted as
`absolute` and the brand is appended once, with a separator.

**Every page has a social image.** Pages without their own artwork fall back to
`/images/brand/og-default.jpg` (1200×630). Nothing shares as a bare link.

---

## Structured data

Emitted as a single `@graph` per page, with nodes cross-referenced by `@id` so
search engines read one connected entity rather than loose fragments.

```
Organization ──┬── WebSite ── SearchAction
               │
               └── WebPage ──┬── BreadcrumbList
                             ├── TechArticle
                             └── FAQPage   (question-titled articles)
```

- **`TechArticle`** rather than the generic `Article` Yoast emitted — states
  the support intent and carries `isAccessibleForFree`.
- **`FAQPage`** generated automatically for articles whose title ends in a
  question mark, which is most of this help centre.
- **`BreadcrumbList`** on articles and category pages, referenced by the
  `WebPage` node.
- **`CollectionPage` + `ItemList`** on category and archive pages.
- **`Organization`** with logo, description, support contact point, and
  `sameAs` linking the Facebook, Instagram, X, YouTube and LinkedIn profiles.
  Those same URLs render as the footer social row, from one list in
  `lib/site.ts`, so the two can never drift apart.

Validate with the [Rich Results Test](https://search.google.com/test/rich-results).

---

## Crawling and indexing

- `app/sitemap.ts` — every indexable URL with a real `lastModified` taken from
  each article's `modified` frontmatter, plus `changeFrequency` and `priority`.
- `app/robots.ts` — allows everything except `/search/`, and points at the
  sitemap.
- `/search/` is `noindex` — search result pages are thin duplicates.
- `app/manifest.ts` — name, icons, theme colour.
- All 11 historical WordPress slugs still 301, and `/?s=term` still redirects
  to `/search/?q=term`. Legacy URLs keep their equity.

---

## Performance

Core Web Vitals are a ranking input, and this is a static site, so most of it
comes free. What was done deliberately:

- **Images are served as WebP.** The WordPress export was 47 MB of 24-bit PNG
  screenshots — one was 2.6 MB on its own — and body images never pass through
  next/image because article HTML is injected directly. Every raster image now
  has a WebP sibling (47 MB → 3.4 MB, 93% smaller; the worst offender went
  2.6 MB → 112 KB) and the renderer emits a `<picture>` so older browsers still
  get the original. Regenerate with
  `python3 scripts/optimize-images.py --write`.
- **No web fonts.** System font stack — zero font requests, no FOUT.
- **Body images are lazy**, with `loading="lazy" decoding="async"`.
- **Images carry real width and height**, read off disk at build time, because
  Markdown syntax cannot express them and without them the page reflows as each
  image loads.
- **Payment marks are a fixed box with `object-fit: contain`**, so the footer
  never shifts when they load.
- **The Visa and UPI marks were 183 KB and 21 KB** — SVGs wrapping oversized
  embedded rasters. Downscaled to 10 KB and 13 KB.
- **Media is cached immutably** for a year via `next.config.mjs` headers.
- **YouTube embeds are click-to-load.** A bare `<iframe>` costs about a
  megabyte of third-party JavaScript per page view; the placeholder costs one
  thumbnail and loads the player only when asked.

Measured on the production build: an article page is roughly 12 KB of
compressed HTML, 102 KB of shared JavaScript, and its images.

## Scaling: what adding content costs

Measured, not estimated — built and served with 500 articles to check.

| | 43 articles | 500 articles |
|---|---|---|
| Build time | 32 s | 36 s |
| Home page | 9.4 KB | 9.4 KB |
| Article page | 11.4 KB | 11.4 KB |
| `/search/` page | 8.0 KB | 8.0 KB |
| `/buyers/` | 9.9 KB | 9.9 KB |
| Busiest category page | 6 KB | 17.2 KB (168 articles) |

(compressed transfer, excluding images)

Build time is dominated by compilation, not page count, so it stays flat.
Pages are prerendered at build and served from the CDN — there is no
per-request work to get slower.

**The one thing that used to scale badly was search.** The index was inlined
into `/search/`, so every visitor downloaded the whole corpus before typing:
35 KB at 43 articles, and growing linearly. It is now a separate prerendered
asset at `/search-index.json`, fetched once and cached, so the page is a
constant 8 KB however many articles exist.

**Category pages are the only thing that still grows**, because they list
every article in the category. At 168 articles that is 17 KB — fast, but a lot
of scrolling. If a single category ever passes roughly 150 articles, the fix is
pagination for readability, not for speed.

### Vercel free tier

Nothing here approaches a limit:

- **Image optimization: zero used.** Every `next/image` call is `unoptimized`
  and body images are plain `<img>`, so none of the 1,000/month transforms are
  consumed.
- **Edge middleware** is scoped to exclude `/_next`, `/images` and anything
  with a file extension, so it runs on page requests only rather than on every
  asset.
- **Everything is static.** No serverless function runs to serve a page,
  including `/search-index.json` and `/sitemap.xml`.
- **Bandwidth**: roughly 150-400 KB per page view including images, against
  100 GB/month.

## Internal linking

Crawl depth and topical clustering, both of which matter for a help centre:

- Left sidebar on every article: recently viewed, more in this category, all
  categories.
- Previous/next navigation, scoped to the article's primary category.
- Breadcrumbs on articles and category pages.
- Category cards carry a summary line, so the link has context rather than
  being a bare title.

---

## Still needs a human

1. **Google Search Console.** Verify the property and submit
   `https://help.beat22.com/sitemap.xml` on the day of cutover. Watch Coverage
   and Redirects for two weeks. Do the same in Bing Webmaster Tools.

2. **Read the derived alt text.** All 125 body images now have alt text, taken
   from the instruction each screenshot sits under —
   `python3 scripts/derive-alt-text.py`. It is a large improvement on 125 empty
   alts, and most of it reads correctly ("Click on Browse at the top"), but it
   is derived rather than authored. Worth a pass in the admin on the
   highest-traffic articles.

3. **Meta descriptions.** All 43 are present and under 160 characters, but the
   ones taken from the first sentence of the body read like body copy rather
   than a search snippet. Worth rewriting the top ten.
