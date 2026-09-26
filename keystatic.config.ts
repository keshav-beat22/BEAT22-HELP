import { config, collection, fields } from '@keystatic/core';
import { block } from '@keystatic/core/content-components';

/**
 * Keystatic admin, served at /keystatic and aliased as /admin.
 *
 * Storage is always the GitHub repo itself: saving in the admin commits to
 * the repository, so publishing is a reviewable git change and there is still
 * no database.
 *
 * There is deliberately no local-storage fallback. It looked safer, but it
 * made the CMS impossible to set up — Keystatic only registers the
 * /keystatic/setup wizard and the github/* API routes in GitHub mode, so the
 * page that generates the secrets only existed once you already had them.
 * GitHub mode also gates the editor behind a sign-in, which local mode does
 * not. The build no longer needs the secrets; see the lazy handler in
 * app/api/keystatic/[...params]/route.ts.
 */

/**
 * Scoped to the whole /images tree, not a dedicated uploads folder.
 *
 * Keystatic can only show an image as an image when its path sits under
 * `publicPath`; anything else falls back to raw Markdown text in the editor.
 * The articles migrated from WordPress reference /images/2025/..., so a
 * narrower uploads/ path left every existing screenshot uneditable.
 */
const IMAGE_DIR = 'public/images';
const IMAGE_PATH = '/images/';

export default config({
  storage: {
    kind: 'github',
    // Must match the repo the Keystatic GitHub App is installed on, and the
    // repo Vercel deploys from — if these disagree, saving in the admin
    // writes somewhere nobody is watching.
    repo: { owner: 'ashishIPM', name: 'BEAT22-HELP' },
  },

  ui: {
    brand: { name: 'Beat22 Help Centre' },
    navigation: { Content: ['posts', 'categories'] },
  },

  collections: {
    posts: collection({
      label: 'Articles',
      slugField: 'title',
      path: 'content/posts/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      // The slugField renders its own column automatically; listing it again
      // produced an empty "Title". Only the extra columns belong here.
      columns: ['date'],

      schema: {
        title: fields.slug({
          name: {
            label: 'Title',
            description:
              'The page heading and the search-result title. Questions work well.',
            validation: { isRequired: true },
          },
          slug: {
            label: 'URL slug',
            description:
              'The last part of the address. Once published, do not change it — every inbound link depends on it.',
          },
        }),

        urlPath: fields.text({
          label: 'Live URL path',
          description:
            'DO NOT CHANGE on a published article — this is the real address and every inbound link depends on it. Leave empty on a new article and it is generated from the publish date and slug.',
        }),

        description: fields.text({
          label: 'Search description',
          description:
            'The sentence Google shows under the title. Aim for 120-160 characters.',
          multiline: true,
          validation: { isRequired: true, length: { max: 160 } },
        }),

        date: fields.datetime({
          label: 'Publish date',
          description: 'Also forms the article URL, so set it before saving.',
          defaultValue: { kind: 'now' },
          validation: { isRequired: true },
        }),

        modified: fields.datetime({
          label: 'Last updated',
          description:
            'Bump after a meaningful edit — it tells search engines to recrawl.',
          defaultValue: { kind: 'now' },
        }),

        // Reads the categories collection, so adding a category there makes it
        // selectable here with no code change.
        categorySlugs: fields.multiRelationship({
          label: 'Categories',
          description:
            'The first selected is the primary category: it drives the breadcrumb, the sidebar and the previous/next links.',
          collection: 'categories',
        }),

        tags: fields.multiselect({
          label: 'Audience',
          description:
            'Buyer and Seller drive the /buyers/ and /sellers/ pages. Blog sends it to /blogs/.',
          options: [
            { label: 'Buyer', value: 'buyer' },
            { label: 'Seller', value: 'seller' },
            { label: 'Blog', value: 'blog' },
          ],
          defaultValue: [],
        }),

        featuredImage: fields.image({
          label: 'Social share image',
          description:
            'Shown when the article is shared. 1200x630 is ideal. Empty uses the site default card.',
          directory: IMAGE_DIR,
          publicPath: IMAGE_PATH,
        }),

        featuredAlt: fields.text({
          label: 'Share image description',
          description: 'What the image shows, for screen readers and image search.',
        }),

        readingTime: fields.text({
          label: 'Reading time (minutes)',
          defaultValue: '2',
        }),

        seoTitle: fields.text({
          label: 'SEO title override',
          description:
            'Leave empty unless the search-result title must differ from the heading.',
        }),

        focusKeyword: fields.text({
          label: 'Focus keyword',
          description: 'Optional. The phrase this article should rank for.',
        }),

        excerpt: fields.text({
          label: 'Card summary',
          description:
            'Shown on category cards. Empty reuses the search description.',
          multiline: true,
        }),

        content: fields.markdoc({
          label: 'Article',
          description:
            'Short answer first, then the detail. Press "/" for headings, lists, images, tables and video.',
          options: {
            bold: true,
            italic: true,
            strikethrough: true,
            code: true,
            // The title is the <h1> and page furniture owns <h2>, so in-body
            // headings render one level deeper than they are authored.
            heading: [2, 3, 4],
            blockquote: true,
            orderedList: true,
            unorderedList: true,
            table: true,
            link: true,
            divider: true,
            codeBlock: true,
            image: { directory: IMAGE_DIR, publicPath: IMAGE_PATH },
          },
          components: {
            youtube: block({
              label: 'YouTube video',
              description:
                'Paste any YouTube link. The player loads only when a reader clicks it.',
              schema: {
                url: fields.url({
                  label: 'YouTube link',
                  description:
                    'Any form works: youtube.com/watch?v=..., youtu.be/..., or a Shorts link.',
                  validation: { isRequired: true },
                }),
                title: fields.text({
                  label: 'Video title',
                  description:
                    'Shown over the thumbnail and read aloud by screen readers.',
                }),
              },
            }),
          },
        }),
      },
    }),

    categories: collection({
      label: 'Categories',
      slugField: 'name',
      path: 'content/categories/*',
      format: 'yaml',
      schema: {
        name: fields.slug({
          name: {
            label: 'Name',
            description: 'The category page heading and the label on cards.',
            validation: { isRequired: true },
          },
          slug: {
            label: 'URL slug',
            description:
              'Becomes /category/<slug>/. Do not change it once articles use it.',
          },
        }),
        description: fields.text({
          label: 'Description',
          description: 'One line, shown under the heading and on the home grid.',
          multiline: true,
        }),
      },
    }),
  },
});
