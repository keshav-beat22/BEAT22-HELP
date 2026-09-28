#!/usr/bin/env python3
"""
Move articles from WordPress's dated permalinks to flat /slug/ URLs.

  python3 scripts/undate-urls.py --check    report only
  python3 scripts/undate-urls.py --write    apply

WordPress served every article at /YYYY/MM/DD/slug/. That structure exists to
order a news archive; a help centre is evergreen, and a date in the URL both
signals staleness to readers scanning search results and forces the whole path
to change if an article is ever re-dated. Flat /slug/ URLs read better, are
shorter in a SERP, and never go out of date.

The old paths are not abandoned. Every one gets a permanent redirect into
content/redirects.json, which next.config.mjs turns into 308s, so anything
already indexed or linked keeps resolving and its ranking signals transfer.
Redirects that already existed (WordPress's own _wp_old_slug entries) have
their destinations rewritten to the new flat path, so no redirect chains form —
one hop, always.

Publish dates are untouched in the frontmatter: they still drive ordering,
the visible "last updated" line and the schema.org dates. Only the address
changes.

Safe to re-run: an article already flat is left alone and no duplicate
redirect is written.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS_DIR = os.path.join(ROOT, 'content', 'posts')
REDIRECTS = os.path.join(ROOT, 'content', 'redirects.json')

DATED = re.compile(r'^/(\d{4})/(\d{2})/(\d{2})/([^/]+)/?$')
write = '--write' in sys.argv


def main():
    moves = {}
    already = 0

    for name in sorted(os.listdir(POSTS_DIR)):
        if not name.endswith(('.mdoc', '.md')):
            continue
        path = os.path.join(POSTS_DIR, name)
        with open(path, encoding='utf-8') as f:
            raw = f.read()

        # A long path is emitted by YAML as a folded scalar:
        #     urlPath: >-
        #       /2025/06/30/really-long-slug/
        # Matching only the single-line form silently skipped those.
        m = re.search(r'^urlPath:[ \t]*>-[ \t]*\n[ \t]+(\S+)[ \t]*$', raw, re.M)
        if not m:
            m = re.search(r'^urlPath:[ \t]*(.+)$', raw, re.M)
        if not m:
            continue
        old = m.group(1).strip().strip('\'"')
        hit = DATED.match(old)
        if not hit:
            already += 1
            continue

        new = f'/{hit.group(4)}/'
        moves[old] = new
        if write:
            # Replace the whole declaration so a folded scalar collapses to
            # one line rather than leaving an orphaned `>-`.
            updated = raw[:m.start()] + f'urlPath: {new}' + raw[m.end():]
            with open(path, 'w', encoding='utf-8') as f:
                f.write(updated)

    with open(REDIRECTS, encoding='utf-8') as f:
        redirects = json.load(f)

    # Point pre-existing redirects at the new flat path so nothing chains.
    rewritten = 0
    for r in redirects:
        if r['destination'] in moves:
            r['destination'] = moves[r['destination']]
            rewritten += 1

    known = {r['source'] for r in redirects}
    added = 0
    for old, new in sorted(moves.items()):
        if old in known:
            continue
        redirects.append({'source': old, 'destination': new, 'permanent': True})
        added += 1

    if write:
        with open(REDIRECTS, 'w', encoding='utf-8') as f:
            json.dump(redirects, f, indent=2)
            f.write('\n')

    print(f'  articles moved to /slug/ : {len(moves)}')
    print(f'  already flat             : {already}')
    print(f'  old paths redirected     : {added}')
    print(f'  existing redirects fixed : {rewritten}')
    print(f'  redirects.json total     : {len(redirects)}')
    if moves:
        k = sorted(moves)[0]
        print(f'  example                  : {k}  ->  {moves[k]}')
    if not write:
        print('\nDry run. Re-run with --write to apply.')


if __name__ == '__main__':
    main()
