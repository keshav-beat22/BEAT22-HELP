import Link from 'next/link';
import Hero from '@/components/Hero';
import ArticleList from '@/components/ArticleList';
import CategoryGrid from '@/components/CategoryGrid';
import JsonLd from '@/components/JsonLd';
import {
  getCategories,
  getPostsByTag,
  getPostsByCategorySlug,
  type Category,
} from '@/lib/posts';
import { graph, collectionSchema, breadcrumbSchema } from '@/lib/seo';

interface Props {
  /** Page heading, e.g. "Buyer" */
  title: string;
  /** Path of this page, e.g. "/buyers/" */
  pathname: string;
  /** Tag used for the hero article, matching WP_Query tag => 'buyer' */
  tag: string;
  /** Category slugs shown in the grid for this audience */
  categorySlugs: string[];
  description: string;
}

/**
 * Shared implementation of buyer-archive.php and seller-archive.php.
 * Both templates had the same shape: hero article by tag, recent articles,
 * then the category grid filtered to that audience.
 */
export default function AudienceArchive({
  title,
  pathname,
  tag,
  categorySlugs,
  description,
}: Props) {
  const tagged = getPostsByTag(tag);
  const heroPost = tagged[0];

  const recent = tagged.slice(0, 6);

  const all = getCategories();
  const gridCategories: Category[] = categorySlugs
    .map((s) => all.find((c) => c.slug === s))
    .filter((c): c is Category => Boolean(c) && (c as Category).count > 0);

  const searchCategories = all.filter((c) => c.count > 0);
  const crumbs = [{ name: 'Help Centre', href: '/' }, { name: title }];

  return (
    <>
      <JsonLd
        data={graph(
          collectionSchema({
            name: title,
            description,
            pathname,
            items: recent.map((p) => ({ name: p.title, url: p.urlPath })),
          }),
          breadcrumbSchema(crumbs.map((c) => ({ name: c.name, item: c.href }))),
        )}
      />

      <div className="help-wrapper">
        <div className="help-main-wrapper">
          <div className="help-main">
            <Hero categories={searchCategories} headline={description} compact />

            {heroPost && (
              <div className="hero-feature">
                <p className="meta">
                  Published:{' '}
                  {new Date(
                    heroPost.date.replace(' ', 'T') + 'Z',
                  ).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'UTC',
                  })}
                </p>
                <h1>{heroPost.title}</h1>
                <Link href={heroPost.urlPath} className="read-more">
                  Read More
                </Link>
              </div>
            )}

            <h2 className="section-title">Frequently Read Articles</h2>
            <ArticleList posts={recent} />

            <h2 className="section-title">Browse All Categories</h2>
            <CategoryGrid categories={gridCategories} />
          </div>
        </div>
      </div>
    </>
  );
}
