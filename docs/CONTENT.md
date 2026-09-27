# Adding and editing content

This replaces `wp-admin`. There is no database — an article is a file, and
publishing is a git commit.

There are two ways in. Use whichever suits the moment.

---

## 1. The admin panel (the WordPress-like way)

**https://help.beat22.com/admin**

Sign in with GitHub. You get a visual editor: rich text, headings, links,
image upload, category pickers. Saving commits to the repository and the site
redeploys automatically.

Locally, `npm run cms` gives you the same editor at
`http://localhost:3000/admin` writing straight to your working copy.

### What the editor gives you

A block editor, similar to Notion or the WordPress block editor.

**Formatting** — bold, italic, strikethrough, inline code, three heading
levels, bullet and numbered lists, quotes, dividers, code blocks and tables.
The toolbar runs along the top; "/" and the "+" button insert blocks.

**Reordering** — every block (paragraph, heading, list, image, video) can be
cut and pasted, or dragged, to move it up or down. That is how you reposition
an image or a video relative to the text around it.

**Images** — the Image button in the toolbar uploads a file, which is
committed alongside the article.

**YouTube** — see [Embedding a YouTube video](#embedding-a-youtube-video). Paste
any YouTube link and it is detected automatically.

**Side panel** — title, URL slug, search description, publish date, last
updated, categories, audience, social share image and reading time.

**Categories** — managed under Content → Categories. Add one there and it
appears immediately in the category picker on every article. No code change.

**History** — every save is a git commit, so any version can be restored.

### One known rough edge

Images that were already in the 43 migrated articles show in the editor as
their Markdown text — `![](/images/2025/09/screenshot.png)` — rather than as a
picture. They render perfectly on the live site, and the line can still be
moved, cut or deleted like any other block, so repositioning works. It is a
display limitation in the editor's handling of pre-existing Markdown images,
not a content problem: opening an article and saving it again reproduces the
file byte for byte.

Images you insert with the toolbar behave normally.

### What the admin cannot do

**Create new pages.** Pages like `/buyers/` and `/sellers/` are React
components with their own layout and structured data — they are code, not
content. Adding one is a developer task (see [Add a page](#add-a-page)).
Articles, which is what almost all new content is, are fully covered.

### Signing in

Two steps, every time:

1. **Access code** at `/admin` — a shared code held in `ADMIN_ACCESS_CODE`.
   Without it nothing under `/admin` or `/keystatic` responds at all. Lasts
   12 hours, then asks again.
2. **Your own account** — identifies who you are, and is what actually
   authorises publishing. Every save is a commit in your name.

If the first screen says access is not configured, `ADMIN_ACCESS_CODE` is
missing from the environment — see [SECURITY.md](SECURITY.md).

### First-time setup

The admin needs a GitHub App, created once by the setup wizard. The wizard
only runs locally — Keystatic refuses to complete it anywhere else, because
it writes secrets to a file:

```bash
npm run dev      # must be on port 3000
```

Open **http://localhost:3000/keystatic/setup**, leave the organisation field
blank, and install the app on **this repository only**. GitHub redirects back
and writes four values into `.env` (gitignored). Restart the dev server —
`NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` is compiled into the browser bundle,
so a running server will not pick it up.

Copy the same four into Vercel → Settings → Environment Variables, ticked for
Production, Preview and Development:

```
KEYSTATIC_GITHUB_CLIENT_ID
KEYSTATIC_GITHUB_CLIENT_SECRET
KEYSTATIC_SECRET
NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG
```

Plus `ADMIN_ACCESS_CODE`, which the wizard does not generate — pick one with
`openssl rand -base64 24`.

Mark `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET` and
`ADMIN_ACCESS_CODE` as **Sensitive** in Vercel. The two `NEXT_PUBLIC_` ones
must stay plain **Config**: that prefix compiles the value into the browser
bundle, so Vercel will not let you mark them secret, and neither is one — the
site URL and the app slug are both public.

Redeploy and the admin is live. Until they are set the public site builds and
serves normally; only `/api/keystatic/*` reports the misconfiguration.

The wizard registers one OAuth callback per origin it knows about. To sign in
from a new address later — the custom domain, say — add it to the GitHub App's
callback list rather than running the wizard again:

```
https://help.beat22.com/api/keystatic/github/oauth/callback
```

Only people with write access to the GitHub repository can sign in, so
removing someone's repo access removes their ability to publish.

---

## 2. The file way

### Add an article with the script

```bash
python3 scripts/new-article.py "How do I withdraw my earnings?" \
  --category profile-related-faqs --tag seller
```

That creates `content/posts/how-do-i-withdraw-my-earnings.md` with valid
frontmatter and prints the URL it will live at. Then:

1. Open the file and write the body.
2. `npm run dev` and check the URL.
3. Commit and push. The deploy is automatic.

Run it with no category to see every available category slug. It refuses to
overwrite an existing file or reuse a URL.

#### Flags

| Flag | Meaning |
|---|---|
| `--category <slug>` | Repeatable. Slugs live in `content/categories.json`. |
| `--tag <tag>` | Repeatable. `buyer` and `seller` drive `/buyers/` and `/sellers/`. |
| `--date YYYY-MM-DD` | Publish date; also sets the URL. Defaults to today. |
| `--slug <slug>` | Override the URL slug derived from the title. |
| `--description "…"` | Meta description. Keep it under 160 characters. |

---

### Edit an article

Open the file in `content/posts/`, change it, push.

Update `modified:` when you make a substantive change — it feeds the
`lastModified` date in the sitemap, which is how search engines learn the page
is worth recrawling.

**Never change `urlPath` on a published article.** That is the live URL. To
move a page, add an entry to `content/redirects.json`:

```json
{ "source": "/old-path/", "destination": "/2026/01/15/new-path/", "permanent": true }
```

---

## Frontmatter reference

```yaml
---
title: "How to upload beats on Beat22?"     # the <h1> and the SERP title
slug: "how-to-upload-beats"
urlPath: "/2025/06/19/how-to-upload-beats/"  # the live URL — permanent
date: "2025-06-19 12:05:41"
modified: "2025-06-19 12:05:41"              # bump this when you edit
seoTitle: ""                                 # leave empty; title is used
description: "Step-by-step guide…"           # meta description, <160 chars
focusKeyword: ""
readingTime: "2"
excerpt: "…"                                 # shown on category cards
categories: ["Content Management"]           # display names
categorySlugs: ["content-management-2"]      # what actually routes
tags: ["seller"]
draft: false                                 # true hides it from the site
---
```

`categories` and `categorySlugs` must line up index for index. The first entry
is the article's primary category: it drives the breadcrumb, the sidebar's
"More in…" list, and the previous/next navigation.

Category counts are computed from the files at build time, so adding an
article to a previously empty category just works — no counter to update.

---

## Writing the body

The body format follows the file extension:

- `.md` — raw HTML. This is what the 43 migrated WordPress articles use.
- `.mdoc` — Markdown, converted to HTML at build time. This is what the admin
  and `new-article.py` write.

Both render identically on the page.

```html
<p>Short answer first — one or two sentences that resolve the question.</p>

<h3>Steps</h3>
<ol><li>First step.</li></ol>
```

Use `<h3>` for sub-headings. `<h1>` is the article title and `<h2>` belongs to
the page furniture, so starting in-body headings at `<h3>` keeps the outline
correct.

---

## Embedding a YouTube video

Drop this where the video should appear in the body:

```html
<div class="yt-embed"
     data-video-id="dQw4w9WgXcQ"
     data-title="How to upload beats on Beat22"></div>
```

`data-video-id` is the 11-character id from the URL — in
`https://www.youtube.com/watch?v=dQw4w9WgXcQ` it is `dQw4w9WgXcQ`. For a
`youtu.be/dQw4w9WgXcQ` link it is the part after the slash.

`data-title` is shown over the thumbnail and read aloud by screen readers, so
write a real description rather than "video".

The page renders a thumbnail with a play button and only loads YouTube's
player when someone clicks. A plain `<iframe>` pulls roughly a megabyte of
third-party JavaScript on every page view whether the video is watched or not,
which is the fastest way to lose the page-speed scores the rest of the site is
tuned for. Playback uses `youtube-nocookie.com`, so no tracking cookie is set
until the visitor actually presses play.

An invalid id renders nothing rather than a broken player.

---

## Images

**From the admin:** use the image button in the editor. Files land in
`public/images/uploads/` and are committed with the article.

**By hand:** put the file in `public/images/` and reference it from the root:

```html
<img src="/images/2026/01/studio-controls.png"
     alt="The Studio Controls screen with the negotiation toggle switched on"
     width="900" height="500" loading="lazy" decoding="async" />
```

Three things matter every time:

- **A real `alt`.** It is read aloud by screen readers and it is what image
  search indexes. Empty `alt=""` is only correct for pure decoration.
- **`width` and `height`.** Without them the page reflows as images load,
  which is a Core Web Vitals penalty.
- **`loading="lazy"`.** If you forget,
  `python3 scripts/build-content.py --lazy-images` adds it everywhere and is
  safe to re-run.

Keep files under about 300 KB. Resize before committing rather than relying on
the browser to scale a 4000px screenshot down to 900px.

---

## Hide an article without deleting it

Tick **Hidden** in the editor and save. The article stays in the repository
exactly as it was, and disappears from everywhere a reader could reach it:

| | Hidden article |
|---|---|
| Home page, category pages, `/buyers/`, `/sellers/`, `/blogs/` | not listed |
| Search | not in the index |
| `sitemap.xml` | not listed |
| Previous/next links on neighbouring articles | skips over it |
| Category counts | excludes it |
| Its own URL | returns the 404 page |

Untick to bring it back. The URL, the position in the date order and the
category counts all return to exactly what they were — nothing is regenerated
and no redirect is involved.

The **Hidden** column in the article list shows `true`/`false`, and sorting by
it groups every hidden article together.

Use this rather than deleting whenever the article might come back — a feature
being rebuilt, a seasonal promotion, a page that is temporarily wrong. Deleting
loses the URL and its history.

A caveat worth knowing: hiding a page that search engines have already indexed
makes it start returning 404, and Google will eventually drop it. That is the
right outcome for something genuinely withdrawn, but if you are only pausing
something briefly, expect to ask for re-indexing when it comes back.

---

## Add a category

Add an entry to `content/categories.json`:

```json
{ "slug": "payouts", "name": "Payouts", "description": "Getting paid", "count": 0 }
```

`count` is ignored — it is recomputed from the articles. The category page
appears as soon as one article lists the slug in `categorySlugs`.

---

## Add a page

Pages are React components. Create `app/<path>/page.tsx`, export `metadata`
built with `pageMetadata()` from `lib/seo.ts` so it gets a canonical URL, an
Open Graph card and a correct title. Copy `app/blogs/page.tsx` as a starting
point.

---

## What not to edit

- `content/posts/` by bulk script — except through `scripts/build-content.py`,
  which is the only thing that should rewrite articles wholesale.
- `lib/seo.ts` — unless you are deliberately changing structured data.
- `next.config.mjs` `trailingSlash` — every legacy URL depends on it.

---

## Maintenance commands

All safe to re-run; each prints what it changed and is a no-op when there is
nothing to do.

```bash
node   scripts/normalise-dates.mjs --write   # dates to the ISO form the editor accepts
python3 scripts/optimize-images.py --write   # regenerate WebP siblings, cap oversized files
python3 scripts/derive-alt-text.py --write   # fill empty image alt text from surrounding copy
python3 scripts/build-content.py --fix-links # repair /slug/ links to the dated URL
python3 scripts/build-content.py --fix-media # repair featuredImage paths
python3 scripts/build-content.py --lazy-images
```

Run `optimize-images.py` after adding images by hand. Images uploaded through
the admin are not converted automatically — run it, or just leave them: a
single modern screenshot is not the problem, 47 MB of them was.

`--fix-links` exists because the WordPress import rewrote
`https://help.beat22.com/<slug>/` to `/<slug>/`, but the real permalink is
`/YYYY/MM/DD/<slug>/`. Six article cross-links were 404ing because of it.

---

## Does adding articles slow the site down?

No. This was measured by building and serving the site with 500 articles:
build time went 32 s to 36 s, and the home page, article pages, `/search/` and
the audience pages were byte-for-byte the same size. Pages are prerendered and
served from the CDN, so there is no per-request work that can get slower.

Two things to keep an eye on as the library grows:

1. **Category pages list every article in the category.** At ~168 articles a
   category page is 17 KB — fast, but a lot of scrolling. Past roughly 150
   articles in one category, splitting it or adding pagination is worth doing
   for readability.
2. **Images you upload in the admin are not converted to WebP automatically.**
   One modern screenshot is not a problem; a habit of uploading 3 MB PNGs is.
   Run `python3 scripts/optimize-images.py --write` occasionally, or before a
   big batch goes live.

See the measured table in [SEO.md](SEO.md#scaling-what-adding-content-costs).
