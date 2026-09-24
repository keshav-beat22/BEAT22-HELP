# Go-live runbook

Do these in order. Nothing here is reversible-unfriendly until step 5, and
step 5 is the only one your visitors notice.

Budget about an hour, plus DNS propagation.

---

## 1. Push to GitHub

```bash
git push
```

The remote and branch are already set, and this is a clean fast-forward — no
`--force`, no merge. If it is rejected, stop and re-read; do not force.

Then on github.com: **Settings → General → confirm the repository is Private.**

---

## 2. Create the Vercel project

1. vercel.com → sign in with GitHub → **Add New → Project**
2. Pick `IP-music/BEAT22-HELP`
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

1. Vercel → **Settings → Domains → Add** `help.beat22.com`. Vercel shows the
   exact record — prefer its values over the illustrative ones below.
2. Hostinger → **Domains → beat22.com → DNS / Nameservers → Manage DNS records**
3. **Delete the existing `help` record** left over from the WordPress host.
   If you leave it, the old record wins and the cutover silently does nothing.
4. Add:

   | Type | Name | Points to | TTL |
   |---|---|---|---|
   | CNAME | `help` | `cname.vercel-dns.com` | 300 |

5. Wait for Vercel to show **Valid Configuration**. HTTPS is automatic.

Only the `help` subdomain moves. The apex `beat22.com` and every other record
stay exactly as they are — **do not change nameservers.**

If Hostinger's editor has a proxy or "website redirect" toggle on the `help`
record, turn it off; a redirect record shadows the CNAME.

Propagation is usually minutes, but the *old* TTL applies first. If the old
record had a 14400 TTL, allow up to four hours before assuming something broke.

Check from outside your own cache:

```bash
dig +short help.beat22.com
curl -sI https://help.beat22.com/ | head -3
```

---

## 6. Same day

- [ ] Google Search Console: add `https://help.beat22.com`, verify, submit
      `https://help.beat22.com/sitemap.xml`
- [ ] Bing Webmaster Tools: same
- [ ] Spot-check five old URLs you know are linked from elsewhere
- [ ] Confirm `https://` (not `http://`) and no certificate warning

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
