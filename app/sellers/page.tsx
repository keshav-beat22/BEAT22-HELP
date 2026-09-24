import type { Metadata } from 'next';
import AudienceArchive from '@/components/AudienceArchive';
import { pageMetadata } from '@/lib/seo';

const DESCRIPTION =
  'Help for uploading beats, licensing, payouts and running your Beat22 studio.';

export const metadata: Metadata = pageMetadata({
  title: 'Seller',
  description: DESCRIPTION,
  pathname: '/sellers/',
});

export default function SellersPage() {
  return (
    <AudienceArchive
      title="Seller"
      pathname="/sellers/"
      tag="seller"
      description={DESCRIPTION}
      categorySlugs={[
        'content-management-2',
        'licensing-content',
        'sales-earnings',
        'studio-faqs',
      ]}
    />
  );
}
