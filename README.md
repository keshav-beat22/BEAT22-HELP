# Beat22 Help Centre

Static Next.js 15 rebuild of `help.beat22.com`, migrated off WordPress.
No database, no PHP, no admin panel — articles are Markdown files in
`content/posts/`, and the site builds to static HTML.

```bash
npm install
npm run dev      # http://localhost:3000
npm run cms      # visual editor at /admin
npm run build    # production build
npm run lint     # eslint
```

Node 20 LTS recommended.

Live: <https://helpbeat22.vercel.app> — custom domain `help.beat22.com` pending DNS.

## Layout

```
app/              routes (App Router), globals.css, sitemap, robots, manifest
  keystatic/      admin UI  ->  /keystatic  (aliased as /admin)
  api/keystatic/  admin's GitHub auth + save endpoints
components/       Header, Footer, Hero, SearchBar, ArticleList, …
content/          posts/*.mdoc (articles), categories/*.yaml, redirects.json
lib/              site.ts (constants), posts.ts (queries), seo.ts (metadata + schema)
public/images/    brand/ (logo, payment marks, OG card), uploads/ (from the admin)
scripts/          new-article.py (scaffold), build-content.py (import + repairs)
keystatic.config  what the admin shows and where it writes
```

## Common tasks

| I want to… | Do this |
|---|---|
| Add or edit an article, embed a video, upload an image | [CONTENT.md](docs/CONTENT.md) |
| Change footer links, logo, CTA | `lib/site.ts` — content only, no components |
| Go live, and the hosting choice | [GO-LIVE.md](docs/GO-LIVE.md) |
| Understand the SEO setup | [SEO.md](docs/SEO.md) |
| Understand how the admin is secured | [SECURITY.md](docs/SECURITY.md) |

## How changes get deployed

Two repositories, one of which Vercel watches.

| Remote | Repository | Role |
|---|---|---|
| `upstream` | `ashishIPM/BEAT22-HELP` | Canonical. **Vercel deploys `main` from here.** |
| `origin` | `keshav-beat22/BEAT22-HELP` | Personal fork. Vercel ignores it. |

Nothing is pushed straight to `upstream/main` — changes go through a pull
request so there is a review point before anything reaches production.

```bash
# start from the canonical main
git checkout main
git pull upstream main

# branch, work, commit
git checkout -b your-change
git commit -am "What changed"

# push the branch to your own fork
git push -u origin your-change
```

Then open a PR from `keshav-beat22:your-change` into `ashishIPM:main`.
Merging it is what triggers the deploy.

After a merge, resync both:

```bash
git checkout main
git pull upstream main
git push origin main      # keep the fork level; GitHub does not do this for you
```

A fork does not sync itself. If `origin/main` drifts behind `upstream/main`,
new branches start from stale code.

## Rules that must not change

- `trailingSlash: true` in `next.config.mjs` — every legacy WordPress URL
  depends on it.
- `urlPath` in an article's frontmatter is the single source of truth for that
  article's URL. Changing it breaks inbound links; add a redirect to
  `content/redirects.json` instead.
