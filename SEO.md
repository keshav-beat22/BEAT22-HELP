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
- **`Organization`** with logo, description and a support contact point.

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

- **No web fonts.** System font stack — zero font requests, no FOUT.
- **Body images are lazy** with `loading="lazy" decoding="async"`, applied at
  import time by `scripts/build-content.py`.
- **Images carry `width`/`height`** so nothing reflows as they load.
- **Payment marks are fixed-box with `object-fit: contain`**, so the footer
  never shifts when they load.
- **The Visa and UPI marks were 183 KB and 21 KB** — SVGs wrapping oversized
  embedded rasters. Downscaled to 10 KB and 13 KB.
- **Media is cached immutably** for a year via `next.config.mjs` headers.

---

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

1. **`site.social` in `lib/site.ts` is empty.** Add the real Instagram,
   YouTube, X and LinkedIn URLs and they are emitted as `Organization.sameAs`,
   which is how search engines tie this domain to the rest of the brand. It is
   omitted entirely while empty — a wrong `sameAs` is worse than none.

2. **Google Search Console.** Verify the property and submit
   `https://help.beat22.com/sitemap.xml` on the day of cutover. Watch Coverage
   and Redirects for two weeks. Do the same in Bing Webmaster Tools.

3. **Image alt text.** Most article images came out of WordPress with
   `alt=""`. They are valid but invisible to image search and to screen
   readers. Filling these in is the single highest-value content task left.

4. **Descriptions are auto-derived for some articles.** All 43 have one under
   160 characters, but the ones taken from the first sentence of the body read
   like body copy, not like a search snippet. Worth a pass.
