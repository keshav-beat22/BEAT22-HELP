#!/usr/bin/env python3
"""
Scaffold a new help-centre article. This is what replaces "Posts > Add New"
in wp-admin.

  python3 scripts/new-article.py "How do I withdraw my earnings?"
  python3 scripts/new-article.py "Refund policy" --category purchasing-pricing
  python3 scripts/new-article.py "Beat licensing" --tag seller --date 2026-01-15

It writes content/posts/<slug>.md with valid frontmatter and a starter body,
picks a URL in the same /YYYY/MM/DD/slug/ shape every existing article uses,
and refuses to overwrite a file or reuse a URL that already exists.

Edit the body, run `npm run dev`, and the article is live at the printed URL.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS_DIR = os.path.join(ROOT, 'content', 'posts')
CATEGORIES = os.path.join(ROOT, 'content', 'categories.json')


def slugify(text):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode()
    text = re.sub(r"['’]", '', text.lower())
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')


def yq(value):
    """Double-quoted YAML scalar, escaped."""
    return '"' + str(value).replace('\\', '\\\\').replace('"', '\\"') + '"'


def load_categories():
    with open(CATEGORIES, encoding='utf-8') as f:
        return json.load(f)


def existing_url_paths():
    paths = set()
    for name in os.listdir(POSTS_DIR):
        if not name.endswith('.md'):
            continue
        with open(os.path.join(POSTS_DIR, name), encoding='utf-8') as f:
            for line in f:
                if line.startswith('urlPath:'):
                    paths.add(line.split(':', 1)[1].strip().strip('"'))
                    break
    return paths


def main():
    ap = argparse.ArgumentParser(description='Create a new help-centre article.')
    ap.add_argument('title', help='Article title, in quotes')
    ap.add_argument('--slug', help='URL slug (default: derived from the title)')
    ap.add_argument('--category', action='append', default=[],
                    help='Category slug; repeatable. See content/categories.json')
    ap.add_argument('--tag', action='append', default=[],
                    help='Tag, e.g. buyer or seller; repeatable')
    ap.add_argument('--date', help='Publish date YYYY-MM-DD (default: today)')
    ap.add_argument('--description', default='',
                    help='Meta description, 150 characters or fewer')
    args = ap.parse_args()

    cats = load_categories()
    by_slug = {c['slug']: c for c in cats}

    unknown = [c for c in args.category if c not in by_slug]
    if unknown:
        print(f'Unknown category slug(s): {", ".join(unknown)}\n', file=sys.stderr)
        print('Available:', file=sys.stderr)
        for c in sorted(cats, key=lambda c: c['slug']):
            print(f'  {c["slug"]:<34} {c["name"]}', file=sys.stderr)
        return 1

    slug = args.slug or slugify(args.title)
    if not slug:
        print('Could not derive a slug; pass --slug explicitly.', file=sys.stderr)
        return 1

    date = (dt.date.fromisoformat(args.date) if args.date else dt.date.today())
    stamp = f'{date.isoformat()} 09:00:00'
    url_path = f'/{date.year}/{date.month:02d}/{date.day:02d}/{slug}/'

    path = os.path.join(POSTS_DIR, f'{slug}.md')
    if os.path.exists(path):
        print(f'Refusing to overwrite {path}', file=sys.stderr)
        return 1
    if url_path in existing_url_paths():
        print(f'URL already in use: {url_path}', file=sys.stderr)
        return 1

    description = args.description or f'{args.title.rstrip("?.")} — Beat22 help centre.'
    if len(description) > 160:
        print('Warning: description is over 160 characters and will be '
              'truncated in search results.', file=sys.stderr)

    front = [
        '---',
        f'title: {yq(args.title)}',
        f'slug: {yq(slug)}',
        f'urlPath: {yq(url_path)}',
        f'date: {yq(stamp)}',
        f'modified: {yq(stamp)}',
        f'seoTitle: {yq("")}',
        f'description: {yq(description)}',
        f'focusKeyword: {yq("")}',
        f'readingTime: {yq("2")}',
        f'excerpt: {yq(description)}',
    ]

    front.append('categories:')
    for c in args.category:
        front.append(f'  - {yq(by_slug[c]["name"])}')
    front.append('categorySlugs:')
    for c in args.category:
        front.append(f'  - {yq(c)}')
    front.append('tags:')
    for t in args.tag:
        front.append(f'  - {yq(t)}')
    front += ['---', '']

    body = f"""<p>Short answer first — one or two sentences that resolve the question.</p>

<h3>Steps</h3>
<ol>
<li>First step.</li>
<li>Second step.</li>
</ol>

<p><strong>Tip:</strong> anything worth calling out.</p>

<!--
  Images: put the file in public/images/ and reference it as
  <img src="/images/your-file.png" alt="Describe what the image shows"
       width="900" height="500" loading="lazy" decoding="async" />
  Always write a real alt attribute - it is read aloud and it is indexed.
-->
"""

    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(front) + body)

    print(f'Created  content/posts/{slug}.md')
    print(f'URL      {url_path}')
    if not args.category:
        print('\nNo category set. The article will not appear on any category '
              'page until you add one to categorySlugs.')
    print('\nNext: edit the file, then `npm run dev` and open the URL above.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
