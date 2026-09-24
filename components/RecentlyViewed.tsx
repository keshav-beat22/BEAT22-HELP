'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const KEY = 'beat22:recent';
const LIMIT = 8;

export interface RecentItem {
  title: string;
  url: string;
}

/**
 * localStorage throws outright in some privacy modes rather than simply being
 * empty, so every access is guarded and failure degrades to "no history".
 */
function read(): RecentItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is RecentItem =>
        typeof i?.title === 'string' && typeof i?.url === 'string',
    );
  } catch {
    return [];
  }
}

function write(items: RecentItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable or full — history is a nicety, not a requirement */
  }
}

/**
 * Sidebar block listing the articles this browser has opened.
 *
 * `current` records the article being viewed as a side effect of mounting;
 * it is left out of the rendered list, since linking to the page you are on
 * is noise.
 */
export default function RecentlyViewed({ current }: { current?: RecentItem }) {
  const [items, setItems] = useState<RecentItem[]>([]);

  // localStorage cannot be read during render without breaking hydration —
  // the server has no access to it, so the first client render must match the
  // server's empty list and fill in afterwards. That makes the setState below
  // the correct pattern here rather than a cascading-render mistake.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = read();

    if (!current) {
      setItems(stored);
      return;
    }

    // De-duplicate by URL, newest first, capped at LIMIT.
    const next = [
      current,
      ...stored.filter((i) => i.url !== current.url),
    ].slice(0, LIMIT);

    write(next);
    // The article being read is recorded but not listed — linking to the page
    // you are already on is noise.
    setItems(next.filter((i) => i.url !== current.url));
    // `current` is rebuilt every render by the parent, so depending on the
    // object itself would loop. Its primitive fields are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.url, current?.title]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (items.length === 0) return null;

  return (
    <section className="sidebar-block">
      <h2>Recently viewed</h2>
      <ul>
        {items.map((i) => (
          <li key={i.url}>
            <Link href={i.url}>{i.title}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
