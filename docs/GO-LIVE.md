# Go-live runbook

Do these in order. Nothing here is reversible-unfriendly until step 5, and
step 5 is the only one your visitors notice.

Budget about an hour, plus DNS propagation.

---

## 1. Push to GitHub — done

`origin/main` matches local: 422 files, 43 articles, 12 categories, 306 images,
and no secrets committed (only `.env.example`, which holds names and no values).

One thing still to confirm on github.com:
**Settings → General → make sure the repository is Private.**

---

## 2. Create the Vercel project

1. vercel.com → sign in with GitHub → **Add New → Project**
2. Pick `ashishIPM/BEAT22-HELP`
3. Framework preset is detected as **Next.js** — change nothing
4. Before clicking Deploy, open **Environment Variables** and add:

   | Name | Value | Environments |
   |---|---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://help.beat22.com` | Production, Preview, Development |

   Set it to the real domain **now**, even though the domain is not pointed
   yet. It drives every canonical, the sitemap and the Open Graph URLs. Wrong
   here is the single most damaging thing that can go wrong.

5. **Deploy**

You get a `*.vercel.app` URL in two or three minutes.

---

## 3. Test on the Vercel URL, before DNS

Everything below is on the `*.vercel.app` address. Do not touch DNS until this
passes.

- [ ] Home page: hero, search, three cards, six articles, category grid
- [ ] Header is one row: wordmark, search, "Go To Beat22"
- [ ] An article loads at its original path:
      `/2025/06/07/how-to-enable-negotiation-feature/`
- [ ] Screenshots appear inside article bodies
- [ ] `/buyers/`, `/sellers/`, `/blogs/`, `/search/` all load
- [ ] A category page shows cards with titles and summaries
- [ ] Article page has the left sidebar and previous/next links
- [ ] Search returns results; the category dropdown filters
- [ ] Footer: all 13 links open, 6 payment marks render, Sign Up works
- [ ] Social icons in the footer open the right profiles
- [ ] An old slug still redirects: `/test-post/`
- [ ] `/sitemap.xml` lists 57 URLs, `/robots.txt` loads
- [ ] Browser tab titles read "… | Beat22" — the brand once, not twice
- [ ] Paste an article URL into WhatsApp or Slack: the share card renders
- [ ] Resize to 375px and 768px — nothing overflows sideways
- [ ] Run the page through PageSpeed Insights; expect green

Or let the script do it:

```bash
npm run verify https://<your-project>.vercel.app
```

It reads the repo's own content, so it checks the site you actually deployed:
every article URL, every legacy redirect, the sitemap, canonicals, og:images,
descriptions, h1 counts, security headers, WebP delivery and that the admin is
kept out of the sitemap. It exits non-zero on failure.

On the preview URL it will note that the canonical points at
`help.beat22.com` while you tested a `vercel.app` address. That is correct —
canonicals must name the final domain. Run it again after the cutover and the
note should disappear.

If something fails here, it is a code or content problem and the old site is
still serving traffic. That is the point of testing before DNS.

---

## 4. Turn on the admin panel

Only after step 3 passes.

1. Visit `https://<your-project>.vercel.app/keystatic/setup`
2. Follow the wizard. It creates a GitHub App and shows four values.
3. Paste all four into **Vercel → Settings → Environment Variables**
   (Production, Preview and Development):

   ```
   KEYSTATIC_GITHUB_CLIENT_ID
   KEYSTATIC_GITHUB_CLIENT_SECRET
   KEYSTATIC_SECRET
   NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG
   ```

4. **Redeploy** (Deployments → ⋯ → Redeploy). Environment variables are read
   at build time; without a redeploy the admin stays in local-only mode.
5. Open `/admin`, sign in with GitHub, open an article, change one word, save.
6. Check the repository — there should be a new commit.

Until those four exist the site builds and serves normally. A missing CMS
never blocks a deploy.

---

## 5. Point the domain (Hostinger)

### What is there today

Checked live, so these are the actual current values:

| Record | Current value | Meaning |
|---|---|---|
| `help.beat22.com` | **A** → `193.203.185.75`, TTL 1800 | The old WordPress, on Hostinger LiteSpeed |
| `beat22.com` (apex) | A → `75.2.60.5` | The main site, hosted elsewhere — **do not touch** |
| `beat22.com` MX | `smtp.google.com` | Google Workspace email — **do not touch** |

The record to change is an **A record**, not a CNAME. You cannot have both an
A and a CNAME on the same hostname, so the A record must be deleted, not edited
around.

TTL is 1800, so propagation is about 30 minutes, not hours.

### Steps

1. **Vercel → Settings → Domains → Add** `help.beat22.com`.
   Vercel then shows the exact record to create. **Use the value it shows you.**
   Each project now gets its own CNAME target that looks like
   `d1d4fc829fe7bc7c.vercel-dns-017.com` — the old shared
   `cname.vercel-dns.com` is not what new projects are given.

2. **Hostinger → Domains → beat22.com → DNS / Nameservers → Manage DNS records.**

3. **Delete** the existing `help` **A** record pointing at `193.203.185.75`.

4. **Add** the CNAME Vercel gave you:

   | Type | Name | Points to | TTL |
   |---|---|---|---|
   | CNAME | `help` | *(the value from Vercel, ending `.vercel-dns-0XX.com`)* | 300 |

5. Wait for Vercel to show **Valid Configuration**. HTTPS is issued
   automatically once it does.

### Leave these completely alone

- **MX, SPF, DKIM, DMARC** — that is Google Workspace email for the whole
  company. Nothing about this migration touches mail.
- **The apex `beat22.com` A record** and any `www` record — different host,
  different site.
- **Nameservers** — they stay at Hostinger. Only one record changes.

If Hostinger shows a proxy or "website redirect" toggle on the `help` record,
turn it off; a redirect record shadows the CNAME.

### Verify from outside your own cache

```bash
dig +short help.beat22.com          # expect the vercel-dns target, not 193.203.185.75
curl -sI https://help.beat22.com/ | head -3
npm run verify https://help.beat22.com
```

The verifier's canonical note should disappear once the domain is live — that
is the signal the cutover is complete and correct.

## 6. Same day

- [ ] Google Search Console: add `https://help.beat22.com`, verify, submit
      `https://help.beat22.com/sitemap.xml`
- [ ] Bing Webmaster Tools: same
- [ ] Spot-check five old URLs you know are linked from elsewhere
- [ ] Confirm `https://` (not `http://`) and no certificate warning

---

## 7. Decommission the old WordPress site

**Not before the new site has been live and correct for at least 48 hours.**
Until DNS has fully propagated and you have watched Search Console for a day
or two, the old install is your rollback. Deleting it early removes that.

### Order matters

1. New site live on `help.beat22.com` and `npm run verify https://help.beat22.com`
   passes
2. Wait 48 hours
3. Back up
4. Then delete

### Back up first — but treat the backup as contaminated

That install was compromised. The backup is for content recovery only.

In Hostinger hPanel:

- **Files → File Manager**, navigate to the `help` subdomain's document root
  (usually `public_html/help` or a folder named for the subdomain). Compress it
  and download the archive.
- **Databases → phpMyAdmin**, select the WordPress database, **Export → Go**,
  and download the `.sql`.

Store both offline — an external drive, not a shared folder that syncs.

**Never restore this backup to a live server.** A compromised WordPress almost
always carries a backdoor in a theme file, an uploads folder, or a database
option row. It is an archive, not a recovery point. If you ever need an old
article from it, copy the text out by hand.

### Delete, in this order

1. **Database user and database.** hPanel → **Databases → MySQL Databases**.
   Delete the WordPress user first, then the database. Removing the user first
   means nothing can reconnect while you work.
2. **Files.** File Manager → the subdomain's document root → select all →
   delete. Include the dotfiles: `.htaccess`, `.user.ini`, and anything like
   `.wp-config.php.bak`. Hidden files are hidden by default — turn them on in
   the File Manager settings first, because backdoors live there.
3. **Cron jobs.** hPanel → **Advanced → Cron Jobs**. WordPress plugins often
   leave `wp-cron.php` entries or custom scripts. Delete anything pointing at
   the deleted folder.
4. **The subdomain entry.** hPanel → **Domains → Subdomains**. Remove `help`
   *only after* the CNAME is in place and working — deleting the subdomain can
   remove its DNS record too, which would take the new site down.
5. **PHP / hosting extras.** If the subdomain had its own PHP version,
   `.htaccess` redirects, or a firewall rule, remove those too.

### Check for things WordPress leaves behind

- **Email forwarders and MX records: leave them alone.** If `beat22.com`
  handles mail, its MX, SPF, DKIM and DMARC records are unrelated to the help
  centre. Do not touch them. This is the single easiest way to break something
  that has nothing to do with this migration.
- **A CDN or proxy in front.** If Cloudflare or Hostinger's own CDN was
  proxying `help.beat22.com`, turn the proxy off for that subdomain — a proxy
  will shadow the Vercel CNAME. Purge its cache afterwards.
- **An old SSL certificate** for the subdomain. Harmless, but tidy to remove
  once Vercel is issuing its own.
- **Third-party integrations.** Revoke API keys the old site held: Jetpack,
  security plugins, backup services, analytics, anything with write access.
  A compromised site's keys should be assumed leaked.
- **Search Console.** Keep the old property if it was `https://help.beat22.com`
  — it is the same URL, so the history carries over. Only remove a property
  that pointed somewhere else.

### Because it was compromised

- Change the **Hostinger account password** and turn on 2FA.
- Change the **database password** before deleting, if you reuse that password
  anywhere.
- If the WordPress admin email was reused elsewhere, change that password too.
- Do not reinstall WordPress on that subdomain "just in case". The reason this
  migration happened was that the install kept being a target; leaving an empty
  one behind reintroduces it.

---

## First two weeks

- Search Console → **Pages**: watch for crawl errors
- Search Console → **Performance**: impressions should recover within days
- Keep the WordPress files archived offline. **Do not put the compromised
  install back online**, for any reason.

---

## If something goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| Canonicals point at `*.vercel.app` | `NEXT_PUBLIC_SITE_URL` wrong or missing | Fix the env var, redeploy |
| Domain stuck "Invalid Configuration" | Old `help` DNS record still present | Delete it, wait for TTL |
| `/admin` says "not configured" | The four env vars are missing, or no redeploy | Add them, redeploy |
| A page 404s that used to work | A `urlPath` was changed | Revert it, or add a redirect to `content/redirects.json` |
| Site looks unstyled for a moment | Normal on first hit of a cold cache | No action |
| Old WordPress still appears | DNS cached, or a proxy is shadowing the CNAME | Check `dig +short help.beat22.com`, turn off any proxy |
| Email stopped working | An MX record was deleted during cleanup | Restore MX/SPF/DKIM; they are unrelated to this site |
| `npm run verify` fails on canonical | `NEXT_PUBLIC_SITE_URL` does not match the domain | Fix the env var, redeploy |

Every deploy is revertable: **Vercel → Deployments → ⋯ → Promote to
Production** on the previous one. That is instant and is your rollback.

---

## A note on what you will see locally

Running `npm run dev` shows a Next.js error overlay. If a browser extension
throws — MetaMask is a common one, with a `chrome-extension://…/inpage.js`
stack — the overlay catches it and shows it as though it were your error. It
is not, and the overlay does not exist in the production build, so it never
appears on the deployed site. To silence it locally, disable the extension for
localhost or use an Incognito window.

---

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

---

## Security notes

- There is no database and no PHP. The public site is prerendered HTML.
- `/admin` and `/keystatic` are `noindex` and carry no site chrome.
- Publishing goes through GitHub, so every change is attributable and
  revertable, and removing someone's repo access removes their ability to
  publish.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`) are set in `next.config.mjs`.

---

## Known advisory

`npm audit` reports a `postcss` advisory. It comes from **Next.js 15's own
pinned dependency**, not from anything added here, and the only "fix" npm
offers is a major upgrade to Next 16. Every one of those advisories requires
processing attacker-controlled CSS at build time; the only CSS this project
compiles is `app/globals.css`, which is first-party. There is no runtime
exposure. Revisit when upgrading to Next 16 deliberately.
