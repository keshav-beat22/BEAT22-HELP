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

`ashishIPM/BEAT22-HELP` is the canonical repository and the only one Vercel
watches. Branches and pull requests both live there.

| Remote | Repository | Role |
|---|---|---|
| `upstream` | `ashishIPM/BEAT22-HELP` | Canonical. Branches, PRs and deploys. |
| `origin` | `keshav-beat22/BEAT22-HELP` | Personal mirror. Optional, not part of the flow. |

Nothing is pushed straight to `main` — changes go through a pull request so
there is a review point before anything reaches production.

```bash
# start from the canonical main
git checkout main
git pull upstream main

# branch, work, commit
git checkout -b your-change
git commit -am "What changed"

# push the branch to the canonical repo
git push -u upstream your-change
```

Open the PR inside `ashishIPM/BEAT22-HELP`, base `main`. Merging it is what
triggers the deploy.

After the merge:

```bash
git checkout main
git pull upstream main
git branch -d your-change
git push upstream --delete your-change
```

### Why not a fork

Everyone working on this has write access to the canonical repository, so a
fork adds a second place for branches to live without adding any control. A
branch pushed to a fork also puts GitHub's "create pull request" prompt on the
fork rather than on the repository that deploys, which is confusing.

The `origin` mirror is harmless to keep as a personal backup. If you do keep
it, remember GitHub never syncs a fork for you:

```bash
git push origin main
```

## Rules that must not change

- `trailingSlash: true` in `next.config.mjs` — every legacy WordPress URL
  depends on it, and so does every redirect in `content/redirects.json`.
- Articles live at flat `/slug/`. WordPress served them at `/YYYY/MM/DD/slug/`;
  those paths all 308 to the flat form and must keep doing so. Run
  `python3 scripts/undate-urls.py --check` after any content import to confirm
  nothing has reverted to a dated path.
- `urlPath` in an article's frontmatter is the single source of truth for that
  article's URL. Changing it breaks inbound links; add a redirect to
  `content/redirects.json` instead.
