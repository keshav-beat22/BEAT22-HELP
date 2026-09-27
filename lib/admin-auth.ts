/**
 * The access-code gate that sits in front of the CMS.
 *
 * Keystatic's own protection is GitHub's: the editor reads and writes through
 * the GitHub API as the signed-in user, so somebody without access to the
 * repository sees nothing and can change nothing. That is sound, but it lets
 * *any* GitHub account reach the sign-in step and complete OAuth, which is
 * more exposure than this admin needs.
 *
 * This gate closes that off. Nothing under /admin, /keystatic or
 * /api/keystatic is reachable without a shared access code first, so an
 * unauthorised visitor never gets as far as an identity prompt. It is a
 * second, independent factor — it does not replace the GitHub check, and
 * passing it grants nothing on its own.
 *
 * Web Crypto rather than node:crypto: this runs in Edge middleware.
 */

const encoder = new TextEncoder();

/** Signed cookie holding proof the access code was entered. */
export const ADMIN_COOKIE = 'b22-admin';

/** Long enough for a working day, short enough that a stolen laptop expires. */
const TTL_MS = 12 * 60 * 60 * 1000;

async function hmac(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(message),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Constant time, so a wrong value cannot be found one character at a time. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Compares digests rather than the codes themselves, so neither the length
 * nor any prefix of the real code is observable from timing.
 */
export async function codeMatches(
  supplied: string,
  expected: string,
): Promise<boolean> {
  if (!expected) return false;
  const [a, b] = await Promise.all([
    hmac(expected, 'admin-gate'),
    hmac(supplied, 'admin-gate'),
  ]);
  return safeEqual(a, b);
}

/** `<expiry>.<signature>` — the signature covers the expiry, so neither can
 *  be edited without the code. Changing the code invalidates every cookie. */
export async function issueToken(code: string): Promise<string> {
  const expiry = String(Date.now() + TTL_MS);
  return `${expiry}.${await hmac(code, expiry)}`;
}

export async function tokenIsValid(
  token: string | undefined,
  code: string,
): Promise<boolean> {
  if (!token || !code) return false;
  const dot = token.indexOf('.');
  if (dot < 1) return false;

  const expiry = token.slice(0, dot);
  if (!/^\d{1,15}$/.test(expiry) || Number(expiry) < Date.now()) return false;

  return safeEqual(token.slice(dot + 1), await hmac(code, expiry));
}

export const COOKIE_MAX_AGE = TTL_MS / 1000;
