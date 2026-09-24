import type { MetadataRoute } from 'next';
import { getAllPosts, getCategories } from '@/lib/posts';
import { site } from '@/lib/site';

/**
 * Replaces the Yoast sitemap. Every indexable URL, with real lastModified
 * dates taken from each post's modified timestamp.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, '');
  const posts = getAllPosts();

  const newest = posts[0]?.modified ?? new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date(newest.replace(' ', 'T') + 'Z'), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/buyers/`, lastModified: new Date(newest.replace(' ', 'T') + 'Z'), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/sellers/`, lastModified: new Date(newest.replace(' ', 'T') + 'Z'), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/blogs/`, lastModified: new Date(newest.replace(' ', 'T') + 'Z'), changeFrequency: 'weekly', priority: 0.7 },
  ];

  const categoryPages: MetadataRoute.Sitemap = getCategories()
    .filter((c) => c.count > 0)
    .map((c) => ({
      url: `${base}/category/${c.slug}/`,
      lastModified: new Date(newest.replace(' ', 'T') + 'Z'),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

  const articlePages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${base}${p.urlPath}`,
    lastModified: new Date((p.modified || p.date).replace(' ', 'T') + 'Z'),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...articlePages];
}
