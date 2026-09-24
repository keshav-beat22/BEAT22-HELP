import type { Metadata } from 'next';
import Hero from '@/components/Hero';
import QuickLinks from '@/components/QuickLinks';
import ArticleList from '@/components/ArticleList';
import CategoryGrid from '@/components/CategoryGrid';
import JsonLd from '@/components/JsonLd';
import {
  getRecentPosts,
  getPopulatedCategories,
  getCategories,
} from '@/lib/posts';
import { site, excludedFromHomeGrid } from '@/lib/site';
import { pageMetadata, graph, collectionSchema } from '@/lib/seo';

export const metadata: Metadata = {
  ...pageMetadata({
    title: site.title,
    description:
      'Find answers about buying beats, selling beats, licensing, payouts and your Beat22 studio.',
    pathname: '/',
    // No image override: the hero art is 1920x600, which social cards crop
    // badly. The 1200x630 default card is the right shape.
  }),
  // The homepage keeps its own full title rather than the "%s | Beat22" template.
  title: { absolute: site.title },
};

export default function HomePage() {
  // WP_Query: post_type=post, posts_per_page=6, orderby=date, order=DESC
  const recent = getRecentPosts(6);

  // get_categories with the Uncategorized / Buyer / Seller exclusions
  const gridCategories = getPopulatedCategories().filter(
    (c) => !excludedFromHomeGrid.includes(c.slug),
  );

  const searchCategories = getCategories().filter((c) => c.count > 0);

  return (
    <>
      <JsonLd
        data={graph(
          collectionSchema({
            name: site.title,
            description:
              'Help articles for buyers and sellers on the Beat22 marketplace.',
            pathname: '/',
            items: recent.map((p) => ({ name: p.title, url: p.urlPath })),
          }),
        )}
      />

      <div className="help-wrapper">
        <div className="help-main-wrapper">
          <div className="help-main">
            <Hero categories={searchCategories} />

            <QuickLinks />

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
