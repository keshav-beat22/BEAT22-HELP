import Link from 'next/link';
import type { Post } from '@/lib/posts';

/**
 * Post-to-post navigation below the article body, restoring what the Astra
 * theme rendered. Either side may be absent at the ends of a category.
 */
export default function PostNavigation({
  previous,
  next,
}: {
  previous: Post | null;
  next: Post | null;
}) {
  if (!previous && !next) return null;

  return (
    <nav className="post-navigation" aria-label="Article navigation">
      {previous ? (
        <Link className="post-nav-card prev" href={previous.urlPath}>
          <span className="arrow" aria-hidden="true">
            &lsaquo;
          </span>
          <span className="text">
            <span className="label">Previous article</span>
            <span className="title">{previous.title}</span>
          </span>
        </Link>
      ) : (
        // Keeps "next" in the right-hand column when there is no previous.
        <span className="post-nav-spacer" aria-hidden="true" />
      )}

      {next && (
        <Link className="post-nav-card next" href={next.urlPath}>
          <span className="text">
            <span className="label">Next article</span>
            <span className="title">{next.title}</span>
          </span>
          <span className="arrow" aria-hidden="true">
            &rsaquo;
          </span>
        </Link>
      )}
    </nav>
  );
}
