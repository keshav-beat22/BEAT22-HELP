import type { Metadata } from 'next';
import Hero from '@/components/Hero';
import SearchResults from '@/components/SearchResults';
import { getAllPosts, getCategories, toPlainText } from '@/lib/posts';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Search',
  description: 'Search the Beat22 help centre.',
  pathname: '/search/',
  // Search result pages should never be indexed; they create thin duplicates.
  noIndex: true,
});

export default function SearchPage() {
  const categories = getCategories().filter((c) => c.count > 0);

  // A compact index shipped with the page. At 43 articles this is a few tens of
  // kilobytes, which is far cheaper than running a search service.
  const index = getAllPosts().map((p) => ({
    title: p.title,
    url: p.urlPath,
    excerpt: p.excerpt,
    categories: p.categories,
    categorySlugs: p.categorySlugs,
    text: toPlainText(p.html).slice(0, 4000).toLowerCase(),
  }));

  return (
    <div className="help-wrapper">
      <div className="help-main-wrapper">
        <div className="help-main">
          <Hero categories={categories} headline="Search" compact />
          <SearchResults index={index} />
        </div>
      </div>
    </div>
  );
}
