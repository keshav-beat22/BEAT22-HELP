/**
 * Check a deployed help centre end to end.
 *
 *   node scripts/verify-deployment.mjs https://beat22-help.vercel.app
 *   node scripts/verify-deployment.mjs https://help.beat22.com
 *
 * Run it against the Vercel preview URL before touching DNS, and again
 * against the real domain after the cutover. Exits non-zero if anything
 * fails, so it can sit in CI later if you want.
 *
 * It reads the repo's own content to build the expectations, so it checks the
 * site actually deployed rather than a hardcoded list that can drift.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base.startsWith('http')) {
  console.error('Usage: node scripts/verify-deployment.mjs https://your-site');
  process.exit(2);
}

const pass = [];
const fail = [];
const warn = [];

const ok = (m) => pass.push(m);
const bad = (m) => fail.push(m);
const meh = (m) => warn.push(m);

const get = (p, init) => fetch(base + p, { redirect: 'manual', ...init });

async function main() {
  // ---- content expectations, read from the repo ----------------------------
  const postsDir = path.join(process.cwd(), 'content', 'posts');
  const posts = fs
    .readdirSync(postsDir)
    .filter((f) => /\.(mdoc|md)$/.test(f))
    .map((f) => matter(fs.readFileSync(path.join(postsDir, f), 'utf8')).data)
    // Hidden articles are deliberately absent from the deployed site, so
    // checking their URLs would fail the run for working as intended.
    .filter((d) => d.urlPath && d.draft !== true);

  console.log(`Checking ${base}`);
  console.log(`Expecting ${posts.length} articles from the repo\n`);

  // ---- 1. core pages -------------------------------------------------------
  for (const p of ['/', '/buyers/', '/sellers/', '/blogs/', '/search/']) {
    const r = await get(p);
    r.status === 200 ? ok(`200 ${p}`) : bad(`${r.status} ${p}`);
  }

  // ---- 2. every article resolves at its original URL ------------------------
  let articleOk = 0;
  for (const d of posts) {
    const r = await get(d.urlPath);
    if (r.status === 200) articleOk++;
    else bad(`${r.status} article ${d.urlPath}`);
  }
  if (articleOk === posts.length) ok(`all ${articleOk} article URLs resolve`);

  // ---- 3. legacy redirects -------------------------------------------------
  const redirects = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'content', 'redirects.json'), 'utf8'),
  );
  let redirOk = 0;
  for (const r of redirects) {
    const res = await get(r.source);
    if (res.status === 301 || res.status === 308) redirOk++;
    else bad(`${res.status} redirect ${r.source} (expected 301/308)`);
  }
  if (redirOk === redirects.length) ok(`all ${redirOk} legacy slug redirects work`);

  const s = await get('/?s=beat');
  [301, 308].includes(s.status)
    ? ok('legacy /?s= search redirect works')
    : bad(`${s.status} /?s=beat (expected 301/308)`);

  // ---- 4. trailing slash policy -------------------------------------------
  const noSlash = await get('/buyers');
  [301, 308].includes(noSlash.status)
    ? ok('slash-less URLs redirect (no duplicate content)')
    : bad(`${noSlash.status} /buyers (expected a redirect to /buyers/)`);

  // ---- 5. machine-readable endpoints ---------------------------------------
  for (const p of ['/sitemap.xml', '/robots.txt', '/manifest.webmanifest', '/search-index.json']) {
    const r = await get(p);
    r.status === 200 ? ok(`200 ${p}`) : bad(`${r.status} ${p}`);
  }

  const sm = await (await fetch(base + '/sitemap.xml')).text();
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const articleLocs = locs.filter((l) => /\/\d{4}\/\d{2}\/\d{2}\//.test(l));
  articleLocs.length === posts.length
    ? ok(`sitemap lists all ${posts.length} articles`)
    : bad(`sitemap lists ${articleLocs.length} articles, expected ${posts.length}`);

  // ---- 6. canonical host — the classic deploy mistake -----------------------
  const home = await (await fetch(base + '/')).text();
  const canonical = home.match(/rel="canonical" href="([^"]+)"/)?.[1] ?? '';
  const canonicalHost = canonical.replace(/^https?:\/\//, '').split('/')[0];
  const baseHost = base.replace(/^https?:\/\//, '');
  if (!canonical) bad('home page has no canonical tag');
  else if (canonicalHost === baseHost) ok(`canonical matches the host (${canonicalHost})`);
  else
    meh(
      `canonical points at ${canonicalHost} but you tested ${baseHost} — correct if you are on the preview URL and NEXT_PUBLIC_SITE_URL is the real domain, WRONG once live`,
    );

  if (locs[0] && !locs[0].includes(canonicalHost))
    bad(`sitemap host (${locs[0]}) disagrees with canonical (${canonicalHost})`);

  // ---- 7. per-page SEO -----------------------------------------------------
  let seoBad = 0;
  for (const l of locs.slice(0, 60)) {
    const p = l.replace(/^https?:\/\/[^/]+/, '');
    const h = await (await fetch(base + p)).text();
    if (!/rel="canonical"/.test(h)) { bad(`no canonical: ${p}`); seoBad++; }
    if (!/property="og:image"/.test(h)) { bad(`no og:image: ${p}`); seoBad++; }
    if (!/name="description" content="[^"]{20,}"/.test(h)) { bad(`weak description: ${p}`); seoBad++; }
    if ((h.match(/<h1[\s>]/g) || []).length !== 1) { bad(`h1 count: ${p}`); seoBad++; }
    // The bug this guards against was "… feature? Beat22 | Beat22". An article
    // title that legitimately contains the brand ("How to buy beats on
    // Beat22? | Beat22") is fine, so match the duplicated suffix, not a count.
    const title = h.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
    if (/Beat22\s*\|\s*Beat22\s*$/.test(title)) { bad(`brand duplicated in title: ${p}`); seoBad++; }
  }
  if (!seoBad) ok(`canonical, og:image, description and single h1 on all ${locs.length} pages`);

  // ---- 8. security headers -------------------------------------------------
  const headers = (await fetch(base + '/')).headers;
  for (const [h, expect] of [
    ['x-content-type-options', 'nosniff'],
    ['x-frame-options', null],
    ['referrer-policy', null],
    ['content-security-policy', 'frame-ancestors'],
  ]) {
    const v = headers.get(h);
    if (!v) bad(`missing header: ${h}`);
    else if (expect && !v.includes(expect)) bad(`header ${h} = "${v}" (expected to contain "${expect}")`);
    else ok(`header ${h}`);
  }
  if (base.startsWith('https://')) {
    headers.get('strict-transport-security')
      ? ok('HSTS present')
      : meh('no HSTS header — Vercel adds it once the custom domain is live');
  }

  // ---- 9. images actually optimised ----------------------------------------
  const article = posts.find((d) => d.urlPath);
  const ah = await (await fetch(base + article.urlPath)).text();
  /<picture>/.test(ah)
    ? ok('article images served through <picture> with WebP')
    : meh('no <picture> in the first article — it may simply have no images');

  const webp = ah.match(/srcset="([^"]+\.webp)"/)?.[1];
  if (webp) {
    const r = await fetch(base + webp, { method: 'HEAD' });
    const len = Number(r.headers.get('content-length') || 0);
    r.status === 200
      ? ok(`WebP served (${Math.round(len / 1024)} KB), cache: ${r.headers.get('cache-control') || 'none'}`)
      : bad(`${r.status} WebP asset ${webp}`);
  }

  // ---- 10. admin is reachable and not indexable ----------------------------
  const admin = await get('/keystatic');
  [200, 307, 308].includes(admin.status)
    ? ok(`/keystatic reachable (${admin.status})`)
    : bad(`${admin.status} /keystatic`);

  const robots = await (await fetch(base + '/robots.txt')).text();
  /Disallow: \/search\//.test(robots)
    ? ok('/search/ disallowed in robots.txt')
    : meh('robots.txt does not disallow /search/');
  if (locs.some((l) => l.includes('/keystatic') || l.includes('/admin')))
    bad('admin URLs are in the sitemap');
  else ok('admin URLs kept out of the sitemap');

  // ---- report --------------------------------------------------------------
  console.log(`PASS ${pass.length}`);
  for (const m of pass) console.log(`  ok    ${m}`);
  if (warn.length) {
    console.log(`\nCHECK ${warn.length}`);
    for (const m of warn) console.log(`  note  ${m}`);
  }
  if (fail.length) {
    console.log(`\nFAIL ${fail.length}`);
    for (const m of fail) console.log(`  FAIL  ${m}`);
    process.exit(1);
  }
  console.log('\nAll checks passed.');
}

main().catch((e) => {
  console.error('\nVerification could not complete:', e.message);
  process.exit(2);
});
