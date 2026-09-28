import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { renderMarkdoc } from './markdoc';
import { load as loadYaml } from 'js-yaml';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');
const CATEGORIES_DIR = path.join(process.cwd(), 'content', 'categories');

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
  /** Hidden in the admin: kept on disk, absent from every page and the sitemap. */
  draft: boolean;
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

/**
 * Two body formats coexist, deliberately:
 *
 *  .mdoc  Markdown body, rendered to HTML at build time. Everything uses this
 *         now, including the articles migrated from WordPress — the admin can
 *         only edit what it can parse.
 *  .md    raw HTML body, passed through untouched. Nothing ships in this form
 *         any more, but the branch stays so a hand-written HTML article keeps
 *         working if one is ever added.
 */
function renderBody(file: string, raw: string): string {
  if (!file.endsWith('.mdoc')) return raw.trim();
  return renderMarkdoc(raw.trim());
}

/**
 * YAML parses an unquoted `2026-09-24` into a Date, not a string, so anything
 * the admin writes arrives as a Date while the WordPress export arrives as
 * "2025-06-07 10:41:57". Normalise both to the string form the rest of the
 * module (sorting, URL derivation, schema dates) expects.
 */
function toDateString(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? ''
      : value.toISOString().slice(0, 19).replace('T', ' ');
  }
  return String(value);
}

/**
 * Categories, read from content/categories/*.yaml — the same files the admin
 * edits, so adding a category there needs no code change. Names are resolved
 * here rather than via getCategories(), which counts posts and would recurse.
 */
function readCategoryFiles(): Omit<Category, 'count'>[] {
  if (!fs.existsSync(CATEGORIES_DIR)) return [];
  return fs
    .readdirSync(CATEGORIES_DIR)
    .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(CATEGORIES_DIR, file), 'utf8');
      const data = (loadYaml(raw) ?? {}) as { name?: string; description?: string };
      return {
        slug: file.replace(/\.ya?ml$/, ''),
        name: data.name ?? '',
        description: data.description ?? '',
      };
    })
    .filter((c) => c.name);
}

function namesForSlugs(slugs: string[]): string[] {
  const all = readCategoryFiles();
  return slugs
    .map((slug) => all.find((c) => c.slug === slug)?.name)
    .filter((n): n is string => Boolean(n));
}

/**
 * Articles authored in the admin have no `urlPath` to type, so derive the
 * same /YYYY/MM/DD/slug/ shape WordPress used from the date and slug.
 */
/**
 * Flat `/slug/`, not WordPress's dated permalink.
 *
 * Help articles are evergreen: a date in the address made every result look
 * stale and meant re-dating an article changed its URL. The dated paths all
 * 308 to the flat ones via content/redirects.json, so nothing was orphaned.
 * `date` is still taken so the signature is stable and the argument documents
 * that ordering comes from frontmatter, not from the URL.
 */
function deriveUrlPath(_date: string, slug: string): string {
  if (!slug) return '';
  return `/${slug}/`;
}

export function getAllPosts(): Post[] {
  if (cache) return cache;

  const files = fs.existsSync(POSTS_DIR)
    ? fs
        .readdirSync(POSTS_DIR)
        .filter((f) => f.endsWith('.md') || f.endsWith('.mdoc'))
    : [];

  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const { data, content } = matter(raw);
    const slug = data.slug ?? file.replace(/\.mdoc?$/, '');
    const date = toDateString(data.date);
    const categorySlugs: string[] = data.categorySlugs ?? [];

    return {
      title: data.title ?? '',
      slug,
      urlPath: data.urlPath ?? deriveUrlPath(date, slug),
      date,
      modified: toDateString(data.modified) || date,
      seoTitle: data.seoTitle ?? '',
      description: data.description ?? '',
      focusKeyword: data.focusKeyword ?? '',
      readingTime: data.readingTime ?? '',
      excerpt: data.excerpt ?? data.description ?? '',
      featuredImage: data.featuredImage,
      featuredAlt: data.featuredAlt ?? '',
      categories: data.categories ?? namesForSlugs(categorySlugs),
      categorySlugs,
      tags: data.tags ?? [],
      draft: data.draft === true,
      html: renderBody(file, content),
    } satisfies Post;
  });

  // Newest first, matching the WP_Query orderby=date order=DESC in the templates.
  posts.sort((a, b) => b.date.localeCompare(a.date));

  // Hidden articles are dropped here rather than at each call site, because
  // every list, the category counts, the search index, the sitemap and
  // generateStaticParams all read through this one function. Dropping them
  // from generateStaticParams is what makes the URL 404 while dynamicParams
  // is false — the file stays on disk, so unticking the box restores it.
  cache = posts.filter((p) => !p.draft);
  return cache;
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
 * Categories with their live article counts.
 *
 * `count` is derived from the files in content/posts, never stored. The old
 * categories.json carried a snapshot of the WordPress export that went stale
 * the moment an article moved, and since generateStaticParams only builds
 * categories with count > 0, a stale zero meant a category page silently
 * failed to exist.
 */
export function getCategories(): Category[] {
  if (categoryCache) return categoryCache;

  const counts = new Map<string, number>();
  for (const post of getAllPosts()) {
    for (const slug of post.categorySlugs) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }

  categoryCache = readCategoryFiles().map((c) => ({
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
  const parts = urlPath.replace(/^\/|\/$/g, '').split('/');
  // Tolerates a legacy dated path as well as the flat form, so a stray
  // /YYYY/MM/DD/slug/ still resolves to the right slug.
  return { slug: parts[parts.length - 1] };
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
