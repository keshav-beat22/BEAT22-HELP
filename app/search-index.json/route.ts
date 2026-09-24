import { getAllPosts, toPlainText } from '@/lib/posts';

/**
 * The search corpus, as a static asset rather than inlined into /search/.
 *
 * The index used to ship inside the search page's HTML, which meant every
 * visitor downloaded the whole corpus before typing anything — 129 KB at 43
 * articles, and growing linearly with every article added. As a separate file
 * it is fetched once, cached by the CDN and by the browser, and never re-sent
 * on repeat visits.
 *
 * `force-static` makes Next prerender this at build time, so on Vercel it is a
 * CDN object, not a serverless function: no invocations, nothing to scale.
 */
export const dynamic = 'force-static';

// Enough of the body to match on without shipping whole articles. Keywords
// that matter in a help article are almost always in the opening section.
const INDEX_CHARS = 1500;

export function GET() {
  const index = getAllPosts().map((p) => ({
    title: p.title,
    url: p.urlPath,
    excerpt: p.excerpt.slice(0, 200),
    categories: p.categories,
    categorySlugs: p.categorySlugs,
    text: toPlainText(p.html).slice(0, INDEX_CHARS).toLowerCase(),
  }));

  return Response.json(index, {
    headers: {
      // Rebuilt on every deploy, so a short shared cache with revalidation
      // keeps it fresh without a round trip on every search.
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
