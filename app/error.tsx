'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Error boundary for the page tree. Without this, anything that throws at
 * runtime shows Next's unbranded default screen.
 *
 * Pages here are prerendered, so this should effectively never appear — which
 * is exactly why it needs to be correct when it does.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in Vercel's runtime logs with the digest shown to the reader.
    console.error('Help centre error:', error);
  }, [error]);

  return (
    <div className="help-wrapper">
      <div className="help-main-wrapper">
        <div className="help-main">
          <div className="page-intro" style={{ marginTop: 80 }}>
            <h1>Something went wrong</h1>
            <p>
              This page failed to load. Try again, or head back to the{' '}
              <Link href="/">help centre home page</Link>.
            </p>
            <p className="page-count" style={{ marginTop: 24 }}>
              <button type="button" className="error-retry" onClick={reset}>
                Try again
              </button>
            </p>
            {error.digest && (
              <p style={{ marginTop: 16, fontSize: 13 }}>
                Reference: <code>{error.digest}</code>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
