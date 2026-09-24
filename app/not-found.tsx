import Link from 'next/link';
import { getRecentPosts } from '@/lib/posts';
import ArticleList from '@/components/ArticleList';

export default function NotFound() {
  const recent = getRecentPosts(6);

  return (
    <div className="help-wrapper">
      <div className="help-main-wrapper">
        <div className="help-main">
          <div className="page-intro" style={{ marginTop: 80 }}>
            <h1>That page has moved or no longer exists</h1>
            <p>
              Try the <Link href="/">help centre home page</Link>, or start with
              one of these.
            </p>
          </div>
          <h2 className="section-title">Frequently Read Articles</h2>
          <ArticleList posts={recent} />
        </div>
      </div>
    </div>
  );
}
