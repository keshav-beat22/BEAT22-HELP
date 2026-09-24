# Deployment

## Recommendation: Vercel

For this site, Vercel is the right choice. AWS is the better choice for some
projects — this is not one of them, and here is the honest reasoning rather
than a blanket preference.

### Why Vercel fits this project

**It is a 43-page static content site.** Every page is prerendered at build
time. There is no server logic, no database, no authentication. This is the
exact workload Vercel's free tier is built around, and you will likely never
pay anything.

**Next.js features work without configuration.** Vercel builds Next.js, so
image optimisation, the App Router, `sitemap.ts`, `robots.ts`, and the
redirects in `next.config.mjs` all work on push with no adapter or plugin. On
AWS you configure each of these yourself.

**Push-to-deploy from GitHub.** Connect the repo once. Every push to `main`
goes live; every pull request gets its own preview URL. For a help centre
edited by non-developers, the preview URL is genuinely useful — someone can
check a new article before it publishes.

**Rollback is one click.** Given you are migrating away from a site that kept
breaking, being able to revert to the previous deployment instantly is worth
something real.

### Where AWS would win, and why it does not apply here

| AWS is better when… | Your situation |
|---|---|
| You need VPC, RDS, or private networking | No backend at all |
| You run heavy server-side compute | Everything is static |
| You are already committed to AWS and want one bill | You are starting fresh |
| You need fine-grained control over caching and WAF | CDN defaults are fine for 43 pages |
| Egress costs at very high traffic | A help centre's traffic is modest |

If you later decide you want AWS, the path is **AWS Amplify Hosting**, which
supports Next.js SSR, rather than raw S3 and CloudFront. Plain S3 static
hosting would mean giving up image optimisation and the redirect handling.

Nothing here locks you in. The project is standard Next.js — moving to Amplify,
Netlify, Cloudflare Pages, or a container later is a configuration change, not
a rewrite.

---

## Step 1 — Push to GitHub

The repository is already initialised and the remote is already set to:

```
git@github.com-work:IP-music/BEAT22-HELP.git
```

`github.com-work` is an SSH host alias, so this assumes a matching `Host
github.com-work` block in `~/.ssh/config` pointing at the right key. Check it
resolves before pushing:

```bash
ssh -T git@github.com-work
```

Then push:

```bash
git push -u origin main
```

**Make the repository private.** It contains the full content set.

The images in `public/images/` are fine to keep in git. If the repo becomes
unwieldy later, move media to a bucket or Vercel Blob — but not now, that is
premature.

## Step 2 — Connect Vercel

1. Sign in to vercel.com with GitHub
2. **Add New → Project**, pick the repo
3. Framework preset is detected as Next.js — leave the defaults
4. Add the environment variable:
   - `NEXT_PUBLIC_SITE_URL` = `https://help.beat22.com`
5. Deploy

You get a `*.vercel.app` URL in a couple of minutes. **Test everything here
before touching DNS.**

## Step 3 — Verify before cutover

Work through this on the preview URL:

- [ ] Homepage: hero, search, three portrait cards, six articles, category grid
- [ ] Header: wordmark, search, "Go To Beat22" all on one row
- [ ] An article loads at its exact original path, e.g.
      `/2025/06/07/how-to-enable-negotiation-feature/`
- [ ] Images render inside article bodies
- [ ] `/buyers/`, `/sellers/`, `/blogs/` all load
- [ ] A category page loads and the cards show titles plus summaries
- [ ] Article page shows the left sidebar and previous/next navigation
- [ ] Search returns results, and the category dropdown filters
- [ ] Footer: 13 links resolve, 6 payment marks render, Sign Up works
- [ ] An old slug redirects, e.g. `/test-post/` → the new URL
- [ ] `/sitemap.xml` lists every article
- [ ] `/robots.txt` and `/manifest.webmanifest` are correct
- [ ] Layout at 375px, 768px and 1440px
- [ ] Titles show "Beat22" once, not twice
- [ ] Rich Results Test on an article URL shows TechArticle and FAQPage
- [ ] Share a URL into WhatsApp or Slack — the OG card renders

A crawl with Screaming Frog against the preview, diffed against your old URL
list, is the most reliable check that nothing is missing.

## Step 4 — Domain and DNS (Hostinger)

The domain is managed at Hostinger, and the site is hosted on Vercel, so
Hostinger only needs to point one subdomain at Vercel.

1. In Vercel: **Project → Settings → Domains → Add** `help.beat22.com`.
   Vercel then shows the exact record to create — use the values it gives you
   over the illustrative ones below.
2. In Hostinger: **Domains → beat22.com → DNS / Nameservers → Manage DNS
   records**.
3. Add a CNAME for the subdomain:

   | Type | Name | Points to | TTL |
   |---|---|---|---|
   | CNAME | `help` | `cname.vercel-dns.com` | 300 (or default) |

4. Delete any existing `help` A/CNAME record left over from the WordPress
   host, otherwise the old record wins and the cutover silently does nothing.
5. Back in Vercel, wait for the domain to show **Valid Configuration**. HTTPS
   is provisioned automatically.

Notes specific to this setup:

- Only the `help` subdomain moves. The apex `beat22.com` and every other
  record stay exactly as they are — do not change nameservers.
- If Hostinger's DNS editor has a proxy or "website redirect" toggle on the
  `help` record, turn it off. A redirect record will shadow the CNAME.
- Propagation is usually minutes, but the old TTL applies first. If the old
  record had a 14400 TTL, allow up to four hours before assuming something
  is wrong.
- Verify from outside your own cache:

  ```bash
  dig +short help.beat22.com
  curl -sI https://help.beat22.com/ | head -3
  ```

## Step 5 — After cutover

- Submit `https://help.beat22.com/sitemap.xml` in Google Search Console
- Watch **Coverage** and **Redirects** for two weeks
- Keep the old WordPress files archived offline for 30 days, but **do not put
  the compromised install back online** at any point

---

## Ongoing publishing

Content is Markdown in `content/posts/`. Three ways to add an article:

1. **Directly in GitHub** — create the file in the web editor and commit.
   No local setup, and the deploy happens automatically.
2. **Locally** — create the file, `npm run dev` to preview, commit and push.
3. **Add a CMS** — Keystatic or Decap give a visual editor on top of these
   same files. Both are free and commit to git, so there is still no
   database and no public admin panel to attack. This can be added at any
   time without changing the content format.

Option 3 is the closest to the WordPress experience. I would suggest running
with option 1 for a few weeks first, then adding the CMS once the site is
settled.

---

## Environment variables

Only one, set in **Vercel → Settings → Environment Variables** for all
environments:

```
NEXT_PUBLIC_SITE_URL=https://help.beat22.com
```

It drives canonicals, Open Graph URLs, the sitemap and the schema `@id`s. If
it is wrong or missing, every canonical points at the wrong host — which is
the single most damaging thing that can go wrong at deploy time.
