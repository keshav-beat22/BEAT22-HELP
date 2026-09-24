import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import categoriesData from '@/content/categories.json';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

export interface Post {
  title: string;
  slug: string;
  /** The original WordPress URL, e.g. /2025/06/07/how-to-upload-beats/ */
  urlPath: string;
  date: string;
  modified: string;
  seoTitle: string;
  description: string;
  focusKeyword: string;
  readingTime: string;
  excerpt: string;
  featuredImage?: string;
  featuredAlt?: string;
  categories: string[];
  categorySlugs: string[];
  tags: string[];
  /** Original post HTML, media paths already rewritten to /images/... */
  html: string;
}

export interface Category {
  slug: string;
  name: string;
  description: string;
  count: number;
}

/** Parsed once per process; the content set is static at build time. */
let cache: Post[] | null = null;
let categoryCache: Category[] | null = null;

export function getAllPosts(): Post[] {
  if (cache) return cache;

  const files = fs.existsSync(POSTS_DIR)
    ? fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'))
    : [];

  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const { data, content } = matter(raw);
    return {
      title: data.title ?? '',
      slug: data.slug ?? file.replace(/\.md$/, ''),
      urlPath: data.urlPath ?? '',
      date: data.date ?? '',
      modified: data.modified ?? data.date ?? '',
      seoTitle: data.seoTitle ?? '',
      description: data.description ?? '',
      focusKeyword: data.focusKeyword ?? '',
      readingTime: data.readingTime ?? '',
      excerpt: data.excerpt ?? '',
      featuredImage: data.featuredImage,
      featuredAlt: data.featuredAlt ?? '',
      categories: data.categories ?? [],
      categorySlugs: data.categorySlugs ?? [],
      tags: data.tags ?? [],
      html: content.trim(),
    } satisfies Post;
  });

  // Newest first, matching the WP_Query orderby=date order=DESC in the templates.
  posts.sort((a, b) => b.date.localeCompare(a.date));
  cache = posts;
  return posts;
}

export function getPostByUrlPath(urlPath: string): Post | undefined {
  const want = normalise(urlPath);
  return getAllPosts().find((p) => normalise(p.urlPath) === want);
}

export function getPostsByCategorySlug(slug: string): Post[] {
  return getAllPosts().filter((p) => p.categorySlugs.includes(slug));
}

export function getPostsByTag(tag: string): Post[] {
  const want = tag.toLowerCase();
  return getAllPosts().filter((p) =>
    p.tags.some((t) => t.toLowerCase() === want),
  );
}

export function getRecentPosts(limit: number): Post[] {
  return getAllPosts().slice(0, limit);
}

/**
 * The posts either side of `slug`, for post-to-post navigation.
 *
 * Scoped to the article's primary category when it has one, so "next" stays
 * within the topic the reader is in; otherwise it walks the full set. Ordering
 * is the date-descending order of getAllPosts(), and, as in the Astra theme it
 * replaces, "previous" is the older article and "next" the newer one.
 * Either side is null at the boundary.
 */
export function getAdjacentPosts(slug: string): {
  previous: Post | null;
  next: Post | null;
} {
  const all = getAllPosts();
  const post = all.find((p) => p.slug === slug);
  if (!post) return { previous: null, next: null };

  const primary = post.categorySlugs[0];
  const scope = primary
    ? all.filter((p) => p.categorySlugs.includes(primary))
    : all;

  const i = scope.findIndex((p) => p.slug === slug);
  if (i === -1) return { previous: null, next: null };

  // Newest first, so the older article sits after this one in the list.
  return {
    previous: scope[i + 1] ?? null,
    next: scope[i - 1] ?? null,
  };
}

/**
 * Categories, with `count` recomputed from the files in content/posts rather
 * than trusted from categories.json.
 *
 * The JSON counts were a snapshot of the WordPress export and went stale the
 * moment an article was added or removed. Since generateStaticParams only
 * builds categories with count > 0, a stale zero meant a new article's
 * category page silently failed to exist. Deriving the number here means
 * dropping a file into content/posts is all that is ever required.
 */
export function getCategories(): Category[] {
  if (categoryCache) return categoryCache;

  const counts = new Map<string, number>();
  for (const post of getAllPosts()) {
    for (const slug of post.categorySlugs) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }

  categoryCache = (categoriesData as Category[]).map((c) => ({
    ...c,
    count: counts.get(c.slug) ?? 0,
  }));
  return categoryCache;
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return getCategories().find((c) => c.slug === slug);
}

/** Categories that actually have posts, for grids and menus. */
export function getPopulatedCategories(): Category[] {
  return getCategories().filter((c) => c.count > 0);
}

/**
 * Splits /2025/06/07/slug/ into its route params so generateStaticParams
 * can reproduce the exact WordPress permalink structure.
 */
export function urlPathToParams(urlPath: string) {
  const [year, month, day, slug] = urlPath.replace(/^\/|\/$/g, '').split('/');
  return { year, month, day, slug };
}

function normalise(p: string): string {
  return `/${p.replace(/^\/|\/$/g, '')}/`;
}

/** Strips HTML for search indexing and meta descriptions. */
export function toPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8217;|&#039;|&rsquo;/g, "'")
    .replace(/&quot;|&#8220;|&#8221;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
