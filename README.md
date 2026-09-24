# Beat22 Help Centre

Static Next.js 15 rebuild of `help.beat22.com`, migrated off WordPress.
No database, no PHP, no admin panel — articles are Markdown files in
`content/posts/`, and the site builds to static HTML.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

Node 20 LTS recommended.

## Layout

```
app/          routes (App Router), globals.css, sitemap, robots, manifest
components/   Header, Footer, Hero, SearchBar, ArticleList, …
content/      posts/*.md (the articles), categories.json, redirects.json
lib/          site.ts (constants), posts.ts (queries), seo.ts (metadata + schema)
public/       images/brand (logo, payment marks, OG card), images/… (media)
scripts/      new-article.py (add an article), build-content.py (WP import)
```

## Common tasks

| I want to… | Do this |
|---|---|
| Add or edit an article | [CONTENT.md](CONTENT.md) |
| Change footer links, logo, CTA | `lib/site.ts` — content only, no components |
| Deploy, or point the domain | [DEPLOYMENT.md](DEPLOYMENT.md) |
| Understand the SEO setup | [SEO.md](SEO.md) |

## Rules that must not change

- `trailingSlash: true` in `next.config.mjs` — every legacy WordPress URL
  depends on it.
- `urlPath` in an article's frontmatter is the single source of truth for that
  article's URL. Changing it breaks inbound links; add a redirect to
  `content/redirects.json` instead.
