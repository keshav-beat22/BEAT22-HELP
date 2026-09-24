import type { Metadata } from 'next';
import Hero from '@/components/Hero';
import SearchResults from '@/components/SearchResults';
import { getCategories } from '@/lib/posts';
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

  return (
    <div className="help-wrapper">
      <div className="help-main-wrapper">
        <div className="help-main">
          <Hero categories={categories} headline="Search" compact />
          {/* The index is fetched from /search-index.json rather than inlined,
              so this page stays the same size no matter how many articles
              exist. */}
          <SearchResults />
        </div>
      </div>
    </div>
  );
}
