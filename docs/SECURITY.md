# Security

WordPress was abandoned because it was repeatedly compromised. This documents
what replaced it and how the admin panel is protected.

---

## Why this is a smaller target

| WordPress | Here |
|---|---|
| PHP executing on every request | Prerendered static HTML |
| MySQL database | Files in a git repository |
| Password login at `/wp-login.php` | GitHub OAuth, no password on this site |
| Plugins and themes running arbitrary code | Two runtime dependencies, both pinned |
| Uploads directory that could execute | Static files only, no execution |
| Anyone could attempt a login | An access code, then repo write access |

There is nothing to SQL-inject, no PHP to execute, and no password for this
site to leak — because there is no password for this site.

---

## How the admin is secured

Two independent layers. Either one failing still leaves the other in the way,
and neither grants anything on its own.

### Layer 1 — the access gate

**Nothing under `/admin`, `/keystatic` or `/api/keystatic` responds without an
access code.** Edge middleware checks a signed cookie before Next.js routes
the request; without it every admin path 307s to `/admin/unlock`. An
unauthorised visitor never reaches an identity prompt, and never learns which
identity provider is behind it.

The cookie is `<expiry>.<HMAC-SHA256 of the expiry, keyed by the code>`, so it
cannot be forged or its expiry extended without the code. It is httpOnly, so
page scripts cannot read it. It lasts 12 hours. Changing `ADMIN_ACCESS_CODE`
invalidates every cookie already issued.

**It fails closed.** An unset `ADMIN_ACCESS_CODE` locks everyone out rather
than opening the door — a config mistake cannot silently expose the CMS.

Two honest limitations. It is a *shared* code, so it identifies nobody — that
is what layer 2 is for. And there is no rate limiting at the edge, so the code
must be long and random (`openssl rand -base64 24`), not memorable.

### Layer 2 — the identity check

**No account exists here.** `/admin` has no username or password of its own.
Sign-in is GitHub OAuth against a GitHub App you own.

**Authorisation is repository write access.** After signing in, Keystatic
checks whether that GitHub account can push to `ashishIPM/BEAT22-HELP`. If it
cannot, the admin is read-only to them. Access is therefore managed in one
place — GitHub's repository settings.

**Removing access is instant and complete.** Remove someone from the
repository and they can no longer publish. There is no second user list to
remember.

**Nothing is written directly to the live site.** Saving commits to the
repository. The site rebuilds from that commit. Every change has an author, a
timestamp and a diff, and reverting is `git revert`.

**MFA carries over.** If GitHub accounts have two-factor enabled — and they
should — publishing inherits it.

**Secrets live in Vercel, never in the repo.** The four Keystatic environment
variables are set in Vercel's dashboard. `.env*` is gitignored; `.env.example`
holds names only, never values.

**The admin is not indexed.** `/admin` and `/keystatic` are `noindex, nofollow`
and are excluded from the sitemap.

**The sign-in screen names nothing.** Both gate screens are ours, not
Keystatic's: no product detail, no mention of the identity provider, and a
wrong code and a missing code give the same message.

### What an attacker would have to do

Obtain the access code, *and* compromise a GitHub account with write access to
the repository, *and* get past that account's 2FA. The second and third are
already enough to own the repository whether or not this admin exists — the
panel adds no new credential to steal, and the access code is an extra hurdle
that only exists here.

### What this does not stop

Somebody who has the access code can reach the sign-in screen and complete
OAuth with any GitHub account. They still see and change nothing: Keystatic
reads and writes through the GitHub API *as that user*, and the GitHub App is
installed on one repository. An account without access gets an empty editor
and failed saves, not a way in.

### Your responsibilities

1. Keep the repository **private**.
2. Grant write access only to people who should publish.
3. Require 2FA on the GitHub organisation.
4. Review the repository's collaborator list periodically.
5. Never paste the Keystatic secrets into a file in the repo.
6. Set `ADMIN_ACCESS_CODE` to a long random value, share it out of band, and
   rotate it when somebody leaves — rotating is one environment variable and a
   redeploy, and it signs out everyone immediately.

---

## Headers

Set in `next.config.mjs` for every route:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

Media under `/images/` is served with a one-year immutable cache.

---

## Content safety

Article bodies are injected with `dangerouslySetInnerHTML`. That is safe here
because the HTML is generated at build time from Markdown in the repository —
it never comes from a visitor, a form or a query string. Markdoc escapes raw
HTML rather than passing it through, so a Markdown body cannot introduce a
`<script>` tag even if someone tried.

YouTube embeds load from `youtube-nocookie.com` and only after a click, so no
third-party cookie is set on page view.

---

## Known advisory

`npm audit` reports a `postcss` advisory reached through **Next.js 15's own
pinned dependency**. Every one of those CVEs requires processing
attacker-controlled CSS at build time; the only CSS this project compiles is
`app/globals.css`, which is first-party. There is no runtime exposure. It
clears when Next is upgraded to 16, which should be a deliberate change rather
than an `npm audit fix --force`.
