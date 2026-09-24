# Adding and editing content

This replaces `wp-admin`. There is no login and no database — an article is a
file, and publishing is a git push.

---

## Add an article

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

### Flags

| Flag | Meaning |
|---|---|
| `--category <slug>` | Repeatable. Slugs live in `content/categories.json`. |
| `--tag <tag>` | Repeatable. `buyer` and `seller` drive `/buyers/` and `/sellers/`. |
| `--date YYYY-MM-DD` | Publish date; also sets the URL. Defaults to today. |
| `--slug <slug>` | Override the URL slug derived from the title. |
| `--description "…"` | Meta description. Keep it under 160 characters. |

---

## Edit an article

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

## The frontmatter

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
---
```

`categories` and `categorySlugs` must line up index for index. The first entry
is the article's primary category: it drives the breadcrumb, the sidebar's
"More in…" list, and the previous/next navigation.

Category counts are computed from the files at build time, so adding an
article to a previously empty category just works — no counter to update.

---

## Body

The body is HTML (that is what came out of WordPress) and Markdown also works.

```html
<p>Short answer first — one or two sentences that resolve the question.</p>

<h3>Steps</h3>
<ol><li>First step.</li></ol>
```

Use `<h3>` for sub-headings. `<h1>` is the article title and `<h2>` belongs to
the page furniture, so starting in-body headings at `<h3>` keeps the outline
correct.

### Images

Put the file in `public/images/` and reference it from the root:

```html
<img src="/images/2026/01/studio-controls.png"
     alt="The Studio Controls screen with the negotiation toggle switched on"
     width="900" height="500" loading="lazy" decoding="async" />
```

- **Always write a real `alt`.** It is read aloud by screen readers and it is
  what image search indexes. Empty `alt=""` is only correct for pure decoration.
- **Always give `width` and `height`.** Without them the page reflows as images
  load, which is a Core Web Vitals penalty.
- `loading="lazy"` on body images; if you forget,
  `python3 scripts/build-content.py --lazy-images` adds it to every article and
  is safe to re-run.

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
