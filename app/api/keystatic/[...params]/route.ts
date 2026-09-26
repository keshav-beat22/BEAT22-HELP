import { makeRouteHandler } from '@keystatic/next/route-handler';
import config from '@/keystatic.config';

/**
 * Admin API. Mirrors the guard on the UI route: until the GitHub App secrets
 * exist, the local-storage fallback would try to read and write a filesystem
 * that is read-only in production, so the endpoints simply do not exist.
 */
const configured = Boolean(
  process.env.KEYSTATIC_GITHUB_CLIENT_ID &&
    process.env.KEYSTATIC_GITHUB_CLIENT_SECRET &&
    process.env.KEYSTATIC_SECRET,
);

const handler = makeRouteHandler({ config });
const gone = () => new Response('Not found', { status: 404 });
const live = configured || process.env.NODE_ENV !== 'production';

export const GET = live ? handler.GET : gone;
export const POST = live ? handler.POST : gone;

export const dynamic = 'force-dynamic';
