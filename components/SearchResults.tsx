'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export interface IndexEntry {
  title: string;
  url: string;
  excerpt: string;
  categories: string[];
  categorySlugs: string[];
  text: string;
}

/**
 * Ranked client-side search. Title matches outweigh body matches, and every
 * term must appear somewhere, which keeps results tight on a small corpus.
 */
function score(entry: IndexEntry, terms: string[]): number {
  const title = entry.title.toLowerCase();
  let total = 0;

  for (const term of terms) {
    const inTitle = title.includes(term);
    const bodyHits = entry.text.split(term).length - 1;
    if (!inTitle && bodyHits === 0) return 0; // every term must match
    if (inTitle) total += 10;
    if (title.startsWith(term)) total += 5;
    total += Math.min(bodyHits, 5);
  }
  return total;
}

function Results() {
  const params = useSearchParams();
  const query = (params.get('q') ?? '').trim();
  const category = params.get('category');

  const [index, setIndex] = useState<IndexEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  // Fetched rather than inlined: the page ships the same bytes whether there
  // are 43 articles or 4,300, and the CDN serves the index from cache.
  useEffect(() => {
    let cancelled = false;
    fetch('/search-index.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: IndexEntry[]) => {
        if (!cancelled) setIndex(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const matches = useMemo(() => {
    if (!index) return [];
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    let pool = index;
    if (category) {
      pool = pool.filter((e) => e.categorySlugs.includes(category));
    }
    if (!terms.length) return category ? pool : [];

    return pool
      .map((entry) => ({ entry, s: score(entry, terms) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.entry);
  }, [index, query, category]);

  if (failed) {
    return (
      <p className="empty-state">
        Search is unavailable right now. Browse the categories on the{' '}
        <Link href="/">home page</Link>.
      </p>
    );
  }

  if (!index) {
    return <p className="empty-state">Loading search…</p>;
  }

  if (!query && !category) {
    return (
      <p className="empty-state">
        Type a keyword above to search the help centre.
      </p>
    );
  }

  if (!matches.length) {
    return (
      <>
        <p className="search-summary">
          No results for “{query}”. Try a different keyword, or browse the
          categories on the <Link href="/">home page</Link>.
        </p>
      </>
    );
  }

  return (
    <>
      <p className="search-summary">
        {matches.length} {matches.length === 1 ? 'result' : 'results'}
        {query && <> for “{query}”</>}
      </p>
      <div className="article-list">
        {matches.map((m) => (
          <Link key={m.url} href={m.url} className="search-result">
            {m.categories[0] && <span className="cat">{m.categories[0]}</span>}
            <h2>{m.title}</h2>
            <p>{m.excerpt.slice(0, 160)}…</p>
          </Link>
        ))}
      </div>
    </>
  );
}

export default function SearchResults() {
  return (
    <Suspense fallback={<p className="empty-state">Loading…</p>}>
      <Results />
    </Suspense>
  );
}
