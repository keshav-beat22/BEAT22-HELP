import type { Metadata } from 'next';
import Link from 'next/link';
import Hero from '@/components/Hero';
import ArticleList from '@/components/ArticleList';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';
import { getCategories, getPostsByTag } from '@/lib/posts';
import { pageMetadata, graph, collectionSchema } from '@/lib/seo';

const DESCRIPTION = 'Guides and longer reads from the Beat22 team.';

export const metadata: Metadata = pageMetadata({
  title: 'Blogs',
  description: DESCRIPTION,
  pathname: '/blogs/',
});

export default function BlogsPage() {
  const posts = getPostsByTag('blog');
  const searchCategories = getCategories().filter((c) => c.count > 0);
  const crumbs = [{ name: 'Help Centre', href: '/' }, { name: 'Blogs' }];

  return (
    <>
      <JsonLd
        data={graph(
          collectionSchema({
            name: 'Blogs',
            description: DESCRIPTION,
            pathname: '/blogs/',
            items: posts.map((p) => ({ name: p.title, url: p.urlPath })),
          }),
        )}
      />

      <div className="help-wrapper">
        <div className="help-main-wrapper">
          <div className="help-main">
            <Hero categories={searchCategories} headline={null} compact />
            <Breadcrumbs crumbs={crumbs} />

            <div className="page-intro">
              <h1>Blogs</h1>
              <p>{DESCRIPTION}</p>
            </div>

            {posts.length > 0 ? (
              <ArticleList posts={posts} />
            ) : (
              <p className="empty-state">
                Longer reads live on the{' '}
                <a href="https://blog.beat22.com/" rel="noopener">
                  Beat22 blog
                </a>
                .
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
