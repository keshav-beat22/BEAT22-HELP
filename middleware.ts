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
const ADMIN_PREFIXES = ['/keystatic', '/api/keystatic', '/admin'];

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

  // Both the admin UI and its API want paths without a trailing slash:
  // Keystatic matches routes on the exact pathname, so `github/login/` is not
  // recognised and 404s, and the client router does the same for its own
  // pages. Next's own redirect is off (skipTrailingSlashRedirect), so the
  // slash is stripped here instead.
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
  /**
   * Everything except framework internals, media and files with an extension.
   *
   * Scoped deliberately: Edge Middleware invocations are metered on Vercel,
   * and matching '/:path*' would spend one on every image, script and
   * stylesheet as well as every page.
   */
  matcher: ['/((?!_next/static|_next/image|images/|favicon.ico|.*\\.[\\w]+$).*)'],
};
