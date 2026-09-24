import type { Metadata } from 'next';
import AudienceArchive from '@/components/AudienceArchive';
import { pageMetadata } from '@/lib/seo';

const DESCRIPTION =
  'Help for buying beats, licences, payments and your orders on Beat22.';

export const metadata: Metadata = pageMetadata({
  title: 'Buyer',
  description: DESCRIPTION,
  pathname: '/buyers/',
});

export default function BuyersPage() {
  return (
    <AudienceArchive
      title="Buyer"
      pathname="/buyers/"
      tag="buyer"
      description={DESCRIPTION}
      categorySlugs={[
        'purchasing-pricing',
        'post-purchase-orders',
        'licensing-content-for-buyers',
        'profile-related-faqs',
        'troubleshooting',
      ]}
    />
  );
}
