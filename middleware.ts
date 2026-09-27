import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, tokenIsValid } from '@/lib/admin-auth';

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
// '/api/admin' is listed so the unlock endpoint follows the admin
// trailing-slash rule too. Without it the public rule appended a slash and
// 308'd the sign-in POST away from its own handler.
const ADMIN_PREFIXES = ['/keystatic', '/api/keystatic', '/admin', '/api/admin'];

/** The gate itself, which obviously cannot sit behind the gate. */
const UNLOCK_PATHS = ['/admin/unlock', '/api/admin/unlock'];

function isAdmin(pathname: string) {
  return ADMIN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isUnlock(pathname: string) {
  return UNLOCK_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
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

    if (isUnlock(pathname)) return NextResponse.next();

    // Fails closed. An admin that quietly opened itself because a variable
    // was missing would be the worst possible outcome of a config mistake,
    // so an unset code locks everyone out and the gate page says why.
    const code = process.env.ADMIN_ACCESS_CODE ?? '';
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    if (!(await tokenIsValid(token, code))) {
      const url = new URL(request.url);
      url.pathname = '/admin/unlock';
      url.search = '';
      return NextResponse.redirect(url.toString(), 307);
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
