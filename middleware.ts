import { NextResponse, type NextRequest } from 'next/server';

/**
 * Trailing-slash policy, applied per path.
 *
 * The public site needs `trailingSlash: true` — every legacy WordPress URL
 * ends in a slash and must keep resolving, and the slash-less form must 308 to
 * it so the same page is never served at two addresses. The Keystatic admin is
 * the opposite: its client-side router matches on `location.pathname` and does
 * not recognise its own routes when a slash is appended, so a bookmark or a
 * refresh inside the admin lands on its "Not found" screen.
 *
 * `skipTrailingSlashRedirect` in next.config.mjs turns off Next's built-in
 * redirect so both rules can live here.
 *
 * The matcher is deliberately free of negative lookahead: Next compiles
 * matcher patterns in the Edge runtime, where a lookahead pattern triggers
 * "Code generation from strings disallowed" and every route 500s. Filtering
 * happens in code below instead.
 */
const ADMIN_PREFIXES = ['/keystatic', '/api/keystatic'];

function isAdmin(pathname: string) {
  return ADMIN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Framework internals and anything with a file extension: leave alone.
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Built from request.url rather than nextUrl.clone(): assigning to
  // nextUrl.pathname normalises the trailing slash back off again, so the
  // redirect target came out identical to the request and looped.
  const to = (nextPath: string) => {
    const url = new URL(request.url);
    url.pathname = nextPath;
    return NextResponse.redirect(url.toString(), 308);
  };

  // The admin's API routes are ordinary Next route handlers and, under
  // trailingSlash: true, are registered with the slash. Only the UI pages need
  // it removed, for Keystatic's client router.
  if (pathname.startsWith('/api/keystatic')) {
    if (!pathname.endsWith('/')) return to(`${pathname}/`);
    return NextResponse.next();
  }

  if (isAdmin(pathname)) {
    if (pathname.length > 1 && pathname.endsWith('/')) {
      return to(pathname.replace(/\/+$/, ''));
    }
    return NextResponse.next();
  }

  if (pathname.length > 1 && !pathname.endsWith('/')) {
    return to(`${pathname}/`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
