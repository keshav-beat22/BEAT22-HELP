import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  COOKIE_MAX_AGE,
  codeMatches,
  issueToken,
} from '@/lib/admin-auth';

/**
 * Checks the access code and, on success, issues the signed cookie the
 * middleware looks for.
 *
 * Always redirects, never returns a body: a failure is indistinguishable
 * from a success apart from where it lands, so there is nothing here for a
 * script to scrape. The cookie is httpOnly, so page scripts cannot read it
 * and an XSS bug elsewhere on the site cannot lift it.
 */
export async function POST(request: Request) {
  const expected = process.env.ADMIN_ACCESS_CODE ?? '';
  const form = await request.formData();
  const supplied = String(form.get('code') ?? '');

  const fail = NextResponse.redirect(
    new URL('/admin/unlock?error=1', request.url),
    303,
  );

  if (!expected || !(await codeMatches(supplied, expected))) return fail;

  const response = NextResponse.redirect(new URL('/keystatic', request.url), 303);
  response.cookies.set(ADMIN_COOKIE, await issueToken(expected), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  return response;
}

export const dynamic = 'force-dynamic';
