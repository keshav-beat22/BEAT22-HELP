import { makeRouteHandler } from '@keystatic/next/route-handler';
import config from '@/keystatic.config';

/**
 * Built on first request, not at module scope.
 *
 * makeRouteHandler throws immediately when the GitHub secrets are absent, and
 * `next build` imports this module to collect route data — so building it
 * eagerly made the whole site fail to deploy until the CMS was configured.
 * Deferring it means the site builds and serves normally, and only the admin
 * endpoints report the misconfiguration, which is the correct blast radius.
 */
let handler: ReturnType<typeof makeRouteHandler> | null = null;

function routes() {
  handler ??= makeRouteHandler({ config });
  return handler;
}

export async function GET(request: Request) {
  return routes().GET(request);
}

export async function POST(request: Request) {
  return routes().POST(request);
}

export const dynamic = 'force-dynamic';
