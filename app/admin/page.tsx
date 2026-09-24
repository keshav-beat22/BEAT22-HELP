import { redirect } from 'next/navigation';

/** Friendly alias so the team can reach the CMS at /admin/. */
export default function AdminRedirect() {
  redirect('/keystatic');
}

export const metadata = { robots: { index: false, follow: false } };
