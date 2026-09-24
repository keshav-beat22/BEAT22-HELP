import Link from 'next/link';
import Image from 'next/image';
import SearchBar from './SearchBar';
import { site } from '@/lib/site';
import type { Category } from '@/lib/posts';

/**
 * Header chrome, matching the wider Beat22 sites: one row, full width.
 *
 *   [logo]   [ search | category | go ]              [Go To Beat22]
 *
 * The original WordPress install had no nav menu (no nav_menu_item rows
 * existed), so there is still no navigation here. The search is the same
 * component the hero uses, in its compact variant, and is hidden below 900px
 * where the hero's own search takes over.
 */
export default function Header({ categories }: { categories: Category[] }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-logo" aria-label={`${site.name} home`}>
          <Image
            src={site.logo.src}
            alt={site.logo.alt}
            width={site.logo.width}
            height={site.logo.height}
            priority
            // Next's image optimizer rejects SVG unless dangerouslyAllowSVG is
            // set; this is our own asset, so serve it as-is instead.
            unoptimized
          />
        </Link>

        <div className="header-search">
          <SearchBar
            categories={categories}
            placeholder={site.hero.searchPlaceholder}
            compact
          />
        </div>

        <a
          className="header-cta"
          href={site.headerCta.href}
          rel="noopener"
          target="_blank"
        >
          {site.headerCta.label}
        </a>
      </div>
    </header>
  );
}
