import Link from 'next/link';
import type { Post } from '@/lib/posts';

/** Trims to a whole word so cards never end mid-syllable. */
function summarise(post: Post, max = 110): string {
  const raw = (post.description || post.excerpt || '').trim();
  if (raw.length <= max) return raw;
  const cut = raw.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

/** The .article-list / .article-box pattern from the WordPress templates. */
export default function ArticleList({ posts }: { posts: Post[] }) {
  if (!posts.length) {
    return <p className="empty-state">No articles here yet.</p>;
  }

  return (
    <div className="article-list">
      {posts.map((post) => {
        const summary = summarise(post);
        return (
          <Link key={post.slug} href={post.urlPath} className="article-box">
            <span className="article-box-body">
              <span className="article-box-title">{post.title}</span>
              {summary && (
                <span className="article-box-excerpt">{summary}</span>
              )}
            </span>
            <span className="article-box-arrow" aria-hidden="true">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
