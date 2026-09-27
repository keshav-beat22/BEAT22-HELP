'use client';

import { makePage } from '@keystatic/next/ui/app';
import config from '@/keystatic.config';
import AdminSignIn from '@/components/AdminSignIn';

/**
 * The admin must live in the client module graph: the config object carries
 * functions (field parse/serialize/validate), which cannot be serialised
 * across the server-to-client boundary. Rendering it from a server component
 * leaves the Suspense boundary pending forever with no error.
 */
const KeystaticApp = makePage(config);

export default function AdminPage() {
  return (
    <>
      <AdminSignIn />
      <KeystaticApp />
    </>
  );
}
