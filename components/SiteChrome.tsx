'use client';

import { usePathname } from 'next/navigation';

/**
 * Hides the public header, footer and skip link on the admin routes.
 *
 * Keystatic renders its own full-page shell, so wrapping it in the site
 * chrome produces a header and footer around the CMS. The App Router allows
 * only one root layout here, so the chrome is filtered by path instead.
 * Server-rendered children pass straight through.
 */
export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const isAdmin =
    pathname.startsWith('/keystatic') || pathname.startsWith('/admin');
  if (isAdmin) return null;
  return <>{children}</>;
}
