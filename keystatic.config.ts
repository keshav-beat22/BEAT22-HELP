import { config, collection, fields } from '@keystatic/core';

/**
 * Keystatic admin, served at /keystatic (and /admin, which redirects there).
 *
 * Storage is the GitHub repo itself: saving in the admin UI commits to a
 * branch and opens a pull request, so publishing is still a reviewable git
 * change and there is still no database.
 *
 * New articles are written as .mdoc (Markdown body). The 43 articles migrated
 * from WordPress stay as .md with raw HTML bodies and are not touched — see
 * the format note in lib/posts.ts.
 */
/**
 * GitHub storage needs three secrets. They only exist once the GitHub App has
 * been created, so fall back to local storage when they are absent — otherwise
 * `next build` fails outright and the whole site stops deploying just because
 * the CMS is not configured yet. Set the three env vars in Vercel and the
 * admin switches to GitHub mode on the next deploy.
 */
const gitHubAppConfigured = Boolean(
  process.env.KEYSTATIC_GITHUB_CLIENT_ID &&
    process.env.KEYSTATIC_GITHUB_CLIENT_SECRET &&
    process.env.KEYSTATIC_SECRET,
);

export default config({
  storage: gitHubAppConfigured
    ? {
        kind: 'github',
        repo: { owner: 'IP-music', name: 'BEAT22-HELP' },
      }
    : { kind: 'local' },

  ui: {
    brand: { name: 'Beat22 Help Centre' },
  },

  collections: {
    posts: collection({
      label: 'Articles',
      slugField: 'title',
      path: 'content/posts/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      columns: ['title', 'date'],

      schema: {
        title: fields.slug({
          name: {
            label: 'Title',
            description:
              'Shown as the page heading and in search results. Questions work well — "How do I withdraw my earnings?"',
            validation: { isRequired: true },
          },
          slug: {
            label: 'URL slug',
            description:
              'The last part of the address. Once published, do not change it.',
          },
        }),

        description: fields.text({
          label: 'Search description',
          description:
            'The sentence Google shows under the title. Keep it under 160 characters.',
          multiline: true,
          validation: { isRequired: true, length: { max: 160 } },
        }),

        date: fields.date({
          label: 'Publish date',
          description: 'Also sets the article URL, so pick it before saving.',
          defaultValue: { kind: 'today' },
          validation: { isRequired: true },
        }),

        modified: fields.date({
          label: 'Last updated',
          description:
            'Bump this after a meaningful edit — it tells search engines to recrawl.',
          defaultValue: { kind: 'today' },
        }),

        categorySlugs: fields.multiselect({
          label: 'Categories',
          description: 'The first one is the primary category.',
          options: [
            { label: 'Licensing Content for Buyers', value: 'licensing-content-for-buyers' },
            { label: 'Post Purchase & Orders', value: 'post-purchase-orders' },
            { label: 'Profile Related FAQs', value: 'profile-related-faqs' },
            { label: 'Purchasing & Pricing', value: 'purchasing-pricing' },
            { label: 'Studio FAQs', value: 'studio-faqs' },
            { label: 'Troubleshooting', value: 'troubleshooting' },
            { label: 'Uncategorized', value: 'uncategorized' },
            { label: 'Content Management', value: 'content-management-2' },
            { label: 'Licensing Content', value: 'licensing-content' },
            { label: 'Sales & Earnings', value: 'sales-earnings' },
          ],
          defaultValue: [],
        }),

        tags: fields.multiselect({
          label: 'Audience',
          description:
            'Drives the /buyers/ and /sellers/ pages. "blog" sends it to /blogs/.',
          options: [
            { label: 'Buyer', value: 'buyer' },
            { label: 'Seller', value: 'seller' },
            { label: 'Blog', value: 'blog' },
          ],
          defaultValue: [],
        }),

        featuredImage: fields.image({
          label: 'Featured image',
          description:
            'Used as the social share card. 1200x630 is the ideal size.',
          directory: 'public/images/uploads',
          publicPath: '/images/uploads/',
        }),

        featuredAlt: fields.text({
          label: 'Featured image description',
          description:
            'What the image shows. Read aloud by screen readers and indexed by image search.',
        }),

        readingTime: fields.text({
          label: 'Reading time (minutes)',
          defaultValue: '2',
        }),

        content: fields.markdoc({
          label: 'Article',
          description:
            'Write the short answer first, then the detail. Use Heading 3 for sub-headings.',
          options: {
            image: {
              directory: 'public/images/uploads',
              publicPath: '/images/uploads/',
            },
          },
        }),
      },
    }),
  },
});
