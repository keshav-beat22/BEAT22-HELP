import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';
import PostNavigation from '@/components/PostNavigation';
import RecentlyViewed from '@/components/RecentlyViewed';
import {
  getAllPosts,
  getAdjacentPosts,
  getPostByUrlPath,
  getPostsByCategorySlug,
  getPopulatedCategories,
  urlPathToParams,
  getCategoryBySlug,
  toPlainText,
} from '@/lib/posts';
import {
  postMetadata,
  graph,
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  webPageSchema,
} from '@/lib/seo';

interface Params {
  year: string;
  month: string;
  day: string;
  slug: string;
}

/**
 * Reproduces every historical permalink, e.g.
 * /2025/06/07/how-to-enable-negotiation-feature/
 */
export function generateStaticParams(): Params[] {
  return getAllPosts().map((p) => urlPathToParams(p.urlPath));
}

export const dynamicParams = false;

function find({ year, month, day, slug }: Params) {
  return getPostByUrlPath(`/${year}/${month}/${day}/${slug}/`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const post = find(await params);
  return post ? postMetadata(post) : {};
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const resolved = await params;
  const post = find(resolved);
  if (!post) notFound();

  const primarySlug = post.categorySlugs[0];
  const primaryCategory = primarySlug ? getCategoryBySlug(primarySlug) : undefined;

  // Sidebar: other articles in the same category, as the single template did.
  const related = primarySlug
    ? getPostsByCategorySlug(primarySlug)
        .filter((p) => p.slug !== post.slug)
        .slice(0, 8)
    : [];

  const allCategories = getPopulatedCategories();
  const { previous, next } = getAdjacentPosts(post.slug);

  const crumbs = [
    { name: 'Help Centre', href: '/' },
    ...(primaryCategory
      ? [
          {
            name: primaryCategory.name,
            href: `/category/${primaryCategory.slug}/`,
          },
        ]
      : []),
    { name: post.title },
  ];

  // Titles phrased as questions are eligible for FAQ rich results.
  const isQuestion = /\?\s*$/.test(post.title.trim());
  const faq = isQuestion
    ? faqSchema([
        {
          question: post.title.trim(),
          answer: toPlainText(post.html).slice(0, 900),
        },
      ])
    : null;

  const published = new Date(post.date.replace(' ', 'T') + 'Z');

  return (
    <>
      <JsonLd
        data={graph(
          webPageSchema({
            pathname: post.urlPath,
            name: post.title,
            description: post.description,
            image: post.featuredImage,
            datePublished: published.toISOString(),
          }),
          articleSchema(post),
          breadcrumbSchema(
            crumbs.map((c) => ({ name: c.name, item: c.href })),
            post.urlPath,
          ),
          ...(faq ? [faq] : []),
        )}
      />

      <div className="help-wrapper">
        <div className="help-main-wrapper">
          <div className="help-main">
            <Breadcrumbs crumbs={crumbs} />

            <header className="article-header">
              <h1 className="article-title">{post.title}</h1>
              <div className="article-meta">
                <time dateTime={published.toISOString()}>
                  {published.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'UTC',
                  })}
                </time>
                {primaryCategory && (
                  <Link href={`/category/${primaryCategory.slug}/`}>
                    {primaryCategory.name}
                  </Link>
                )}
                {post.readingTime && <span>{post.readingTime} min read</span>}
              </div>
            </header>

            <div className="article-layout">
              {/* Sidebar first in the DOM as well as on screen: it now sits
                  in the left column. */}
              <aside className="help-sidebar">
                <RecentlyViewed
                  current={{ title: post.title, url: post.urlPath }}
                />

                {related.length > 0 && (
                  <section className="sidebar-block">
                    <h2>More in {primaryCategory?.name}</h2>
                    <ul>
                      {related.map((r) => (
                        <li key={r.slug}>
                          <Link href={r.urlPath}>{r.title}</Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section className="sidebar-block">
                  <h2>All categories</h2>
                  <ul>
                    {allCategories.map((c) => (
                      <li key={c.slug}>
                        <Link href={`/category/${c.slug}/`}>{c.name}</Link>
                      </li>
                    ))}
                  </ul>
                </section>
              </aside>

              <div className="article-body">
                <article
                  className="entry-content"
                  // Post HTML comes from our own build-time content files.
                  dangerouslySetInnerHTML={{ __html: post.html }}
                />

                <PostNavigation previous={previous} next={next} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
