'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Covers Keystatic's own signed-out screen with ours.
 *
 * Keystatic renders a bare "Log in with GitHub" button, which names the
 * identity provider to anyone who reaches it and gives no indication that
 * this is a restricted system. Its UI is compiled into the package and takes
 * no customisation, so rather than fighting it this sits on top as an opaque
 * overlay and offers the same action under our own wording.
 *
 * The button is a plain link to the sign-in endpoint, which is exactly what
 * Keystatic's own button does — so nothing about the flow changes, only what
 * the reader sees.
 *
 * Signed-in state comes from `keystatic-gh-access-token`. Keystatic sets that
 * without httpOnly on purpose, because its client calls the API with it, so
 * reading it here reveals nothing new. It is not a security check: the real
 * ones are the access-code cookie enforced in middleware and the repository
 * permissions enforced by the identity provider.
 */
export default function AdminSignIn() {
  // null until the cookie has been read, so the overlay cannot flash over
  // the editor for somebody who is already signed in.
  const [signedOut, setSignedOut] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () =>
      setSignedOut(!/(^|;\s*)keystatic-gh-access-token=/.test(document.cookie));
    check();
    // The cookie appears without a reload when the sign-in window completes.
    const timer = window.setInterval(check, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (signedOut !== true) return null;

  return (
    <div className="gate gate--overlay">
      <main className="gate-card">
        <p className="gate-eyebrow">Beat22</p>
        <h1>Sign in to continue</h1>
        <p className="gate-lead">
          Publishing access is limited to named Beat22 staff accounts. Every
          change is recorded against the account that made it.
        </p>
        {/* A real navigation, not a route change: this is an API endpoint
            that issues a redirect to the identity provider. next/link would
            try to resolve it as a page. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="gate-button" href="/api/keystatic/github/login">
          Log in
        </a>
        <p className="gate-foot">
          Not what you were looking for? <Link href="/">Beat22 Help Centre</Link>
        </p>
      </main>
    </div>
  );
}
