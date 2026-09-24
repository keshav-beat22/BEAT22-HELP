import { site } from '@/lib/site';
import SearchBar from './SearchBar';
import type { Category } from '@/lib/posts';

/**
 * Full-bleed hero with the gradient overlay and centred search.
 *
 * The home page uses the full 440px banner. Every other page uses `compact`,
 * a 220px band — the full height left a large empty gap above the content on
 * category and archive pages.
 *
 * Heading element differs by variant, for a correct document outline: the
 * home page has no other heading, so the full hero carries the <h1>. Pages
 * that carry their own <h1> in .page-intro pass headline={null} so the same
 * text is not printed twice on screen.
 */
export default function Hero({
  categories,
  headline = site.hero.headline,
  compact = false,
}: {
  categories: Category[];
  /** Pass null to render the band with the search only, no heading. */
  headline?: string | null;
  compact?: boolean;
}) {
  return (
    <div
      className={`full-width-banner${compact ? ' compact' : ''}`}
      style={{ backgroundImage: `url('${site.hero.image}')` }}
    >
      <div className="banner-overlay" />
      <div className="banner-center-content">
        {headline &&
          (compact ? (
            <p className="banner-headline">{headline}</p>
          ) : (
            <h1 className="banner-headline">{headline}</h1>
          ))}
        <div className="search-aligned-wrapper">
          <SearchBar categories={categories} />
        </div>
      </div>
    </div>
  );
}
