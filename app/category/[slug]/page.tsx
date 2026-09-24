import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Hero from '@/components/Hero';
import ArticleList from '@/components/ArticleList';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';
import {
  getCategories,
  getCategoryBySlug,
  getPostsByCategorySlug,
} from '@/lib/posts';
import {
  categoryMetadata,
  graph,
  collectionSchema,
  breadcrumbSchema,
  webPageSchema,
} from '@/lib/seo';

interface Params {
  slug: string;
}

export function generateStaticParams(): Params[] {
  return getCategories()
    .filter((c) => c.count > 0)
    .map((c) => ({ slug: c.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  return category ? categoryMetadata(category) : {};
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const posts = getPostsByCategorySlug(slug);
  const searchCategories = getCategories().filter((c) => c.count > 0);

  const crumbs = [{ name: 'Help Centre', href: '/' }, { name: category.name }];

  return (
    <>
      <JsonLd
        data={graph(
          webPageSchema({
            pathname: `/category/${category.slug}/`,
            name: category.name,
            description:
              category.description || `Articles about ${category.name}.`,
          }),
          collectionSchema({
            name: category.name,
            description: category.description || `Articles about ${category.name}.`,
            pathname: `/category/${category.slug}/`,
            items: posts.map((p) => ({ name: p.title, url: p.urlPath })),
          }),
          breadcrumbSchema(
            crumbs.map((c) => ({ name: c.name, item: c.href })),
            `/category/${category.slug}/`,
          ),
        )}
      />

      <div className="help-wrapper">
        <div className="help-main-wrapper">
          <div className="help-main">
            <Hero categories={searchCategories} headline={null} compact />

            <Breadcrumbs crumbs={crumbs} />

            <div className="page-intro">
              <h1>{category.name}</h1>
              {category.description && <p>{category.description}</p>}
              <p className="page-count">
                {posts.length} {posts.length === 1 ? 'article' : 'articles'}
              </p>
            </div>

            <ArticleList posts={posts} />
          </div>
        </div>
      </div>
    </>
  );
}
