import { makeRouteHandler } from '@keystatic/next/route-handler';
import config from '@/keystatic.config';

export const { POST, GET } = makeRouteHandler({ config });

// Auth callbacks and GitHub calls must run per-request, never be cached.
export const dynamic = 'force-dynamic';
