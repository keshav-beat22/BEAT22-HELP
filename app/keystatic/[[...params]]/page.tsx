import { notFound } from 'next/navigation';
import KeystaticApp from '../keystatic';

/**
 * The admin is only served once the GitHub App is configured.
 *
 * Without those secrets keystatic.config.ts falls back to `local` storage so
 * that a missing CMS can never break the build. On a deployed server that
 * fallback is useless and misleading: local mode assumes it is running on a
 * developer's own machine, so it asks for no sign-in, and it reads a
 * filesystem that is read-only and does not contain the content directory —
 * which is why the editor rendered with no articles and no authentication.
 *
 * Returning 404 until it is configured means the deployed site never exposes
 * an admin shell that cannot work.
 */
const configured = Boolean(
  process.env.KEYSTATIC_GITHUB_CLIENT_ID &&
    process.env.KEYSTATIC_GITHUB_CLIENT_SECRET &&
    process.env.KEYSTATIC_SECRET,
);

export default function Page() {
  if (!configured && process.env.NODE_ENV === 'production') notFound();
  return <KeystaticApp />;
}

export const metadata = { robots: { index: false, follow: false } };
