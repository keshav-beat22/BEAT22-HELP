import Link from 'next/link';
import type { Category } from '@/lib/posts';

/**
 * The .category-grid / .category-box pattern. The description falls back to
 * "Explore articles" exactly as the PHP template did.
 */
export default function CategoryGrid({ categories }: { categories: Category[] }) {
  if (!categories.length) {
    return <p className="empty-state">No categories to show.</p>;
  }

  return (
    <div className="category-grid">
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/category/${category.slug}/`}
          className="category-box"
        >
          <div className="category-box-title-highlight">
            <h3>{category.name}</h3>
          </div>
          <div className="category-box-description">
            <span>{category.description || 'Explore articles'}</span>
            <span aria-hidden="true">›</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
