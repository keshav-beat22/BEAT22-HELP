import { redirect } from 'next/navigation';

/** Friendly alias for the CMS. */
export default function AdminRedirect() {
  redirect('/keystatic');
}

export const metadata = { robots: { index: false, follow: false } };
