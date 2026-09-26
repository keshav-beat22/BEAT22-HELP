import { notFound, redirect } from 'next/navigation';

/** Friendly alias for the CMS. 404s until the GitHub App is configured. */
const configured = Boolean(
  process.env.KEYSTATIC_GITHUB_CLIENT_ID &&
    process.env.KEYSTATIC_GITHUB_CLIENT_SECRET &&
    process.env.KEYSTATIC_SECRET,
);

export default function AdminRedirect() {
  if (!configured && process.env.NODE_ENV === 'production') notFound();
  redirect('/keystatic');
}

export const metadata = { robots: { index: false, follow: false } };
