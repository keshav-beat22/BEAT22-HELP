#!/usr/bin/env python3
"""
Build content/ and public/images/ for the Next.js site from the WordPress export.

  python3 scripts/build-content.py <wordpress-export.xml> <wp-uploads-dir>
  python3 scripts/build-content.py --lazy-images   # re-apply lazy <img> only

Produces:
  content/posts/<slug>.md    frontmatter + original post HTML
  content/categories.json    categories with descriptions and counts
  content/redirects.json     301 map from historical slugs
  public/images/...          only the media actually referenced
"""
import xml.etree.ElementTree as ET
import json, os, re, html, sys, shutil
from collections import Counter
from urllib.parse import urlparse

NS = {
    'wp': 'http://wordpress.org/export/1.2/',
    'content': 'http://purl.org/rss/1.0/modules/content/',
    'excerpt': 'http://wordpress.org/export/1.2/excerpt/',
}

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS_DIR = os.path.join(ROOT, 'content', 'posts')
IMG_DIR = os.path.join(ROOT, 'public', 'images')
os.makedirs(POSTS_DIR, exist_ok=True)
os.makedirs(IMG_DIR, exist_ok=True)

SITE = 'https://help.beat22.com'


def lazy_images(body):
    """Mark post-body images lazy.

    Article images are below the fold, so deferring them removes a burst of
    requests from first paint. It happens here, at import time, because the
    body is injected with dangerouslySetInnerHTML and cannot be rewritten at
    render time without re-parsing every article on every request.

    Idempotent: an <img> that already declares loading is left untouched.
    """
    def add(m):
        tag = m.group(0)
        if re.search(r'\sloading\s*=', tag, re.I):
            return tag
        return tag[:4] + ' loading="lazy" decoding="async"' + tag[4:]

    return re.sub(r'<img\b[^>]*>', add, body, flags=re.I)


def retrofit_lazy_images():
    """Apply lazy_images() to the articles already in content/posts/.

    A full re-import needs the original WordPress export XML. This applies the
    same transformation to the content that is already checked in, so
    content/posts/ is still only ever written by this script.
    """
    changed = 0
    for name in sorted(os.listdir(POSTS_DIR)):
        if not name.endswith('.md'):
            continue
        path = os.path.join(POSTS_DIR, name)
        with open(path, encoding='utf-8') as f:
            text = f.read()
        m = re.match(r'(?s)\A(---\n.*?\n---\n)(.*)\Z', text)
        if not m:
            print(f'  skipped (no frontmatter): {name}')
            continue
        front, body = m.group(1), m.group(2)
        updated = lazy_images(body)
        if updated != body:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(front + updated)
            changed += 1
    print(f'lazy-images: updated {changed} file(s)')


if len(sys.argv) > 1 and sys.argv[1] == '--lazy-images':
    retrofit_lazy_images()
    sys.exit(0)

XML = sys.argv[1]
UPLOADS = sys.argv[2] if len(sys.argv) > 2 else None


def safe_path(p):
    """WordPress allows en-dashes and other non-ASCII in filenames, and archive
    tools re-encode them (a en-dash becomes '#U2013'). Both forms break URLs.
    Normalise every media path to plain ASCII once, here, so the file on disk
    and the reference in the HTML can never disagree."""
    d, base = os.path.split(p)
    base = re.sub(r'[^A-Za-z0-9._-]+', '-', base)
    base = re.sub(r'-{2,}', '-', base)
    return f'{d}/{base}' if d else base


def disk_candidates(rel):
    """Possible on-disk spellings of an original WordPress media path."""
    out = [rel]
    # archive tools rewrite non-ASCII as '#UXXXX'
    enc = ''.join(c if ord(c) < 128 else f'#U{ord(c):04X}' for c in rel)
    if enc != rel:
        out.append(enc)
    return out


def postmeta(item):
    d = {}
    for m in item.findall('wp:postmeta', NS):
        k = m.find('wp:meta_key', NS).text
        v = m.find('wp:meta_value', NS)
        d[k] = v.text if v is not None else ''
    return d


def yq(s):
    s = '' if s is None else str(s)
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"').replace('\n', ' ') + '"'


root = ET.parse(XML).getroot()
items = root.findall('.//item')

# ---- attachments ------------------------------------------------------------
att = {}
for i in items:
    if i.find('wp:post_type', NS).text != 'attachment':
        continue
    u = i.find('wp:attachment_url', NS)
    if u is None:
        continue
    pid = i.find('wp:post_id', NS).text
    local = urlparse(u.text).path.replace('/wp-content/uploads/', '/images/')
    meta = postmeta(i)
    att[pid] = {
        'local': local,
        'alt': meta.get('_wp_attachment_image_alt', '') or '',
        'title': i.find('title').text or '',
    }

# ---- posts ------------------------------------------------------------------
posts, redirects, referenced = [], [], set()

for i in items:
    if i.find('wp:post_type', NS).text != 'post':
        continue
    status = i.find('wp:status', NS).text
    if status != 'publish':
        continue

    title = i.find('title').text or ''
    slug = i.find('wp:post_name', NS).text or ''
    link = i.find('link').text or ''
    body = i.find('content:encoded', NS).text or ''
    meta = postmeta(i)

    # keep the original URL exactly: /YYYY/MM/DD/slug/
    url_path = urlparse(link).path

    # point media at the local folder, make internal links relative
    body = re.sub(r'https?://help\.beat22\.com/wp-content/uploads/', '/images/', body)
    body = re.sub(r'https?://help\.beat22\.com/', '/', body)

    # normalise every media reference, then record the normalised path
    def _fix(m):
        attr, path = m.group(1), m.group(2)
        return f'{attr}="{safe_path(path)}"'

    body = re.sub(r'(src|href)="(/images/[^"]+)"', _fix, body)
    body = lazy_images(body)
    # WordPress emits width/height on <img>; keep them, they prevent layout shift
    for m in re.finditer(r'(?:src|href)="(/images/[^"]+)"', body):
        referenced.add(m.group(1))

    thumb = meta.get('_thumbnail_id')
    featured = att.get(thumb, {}).get('local') if thumb else None
    featured_alt = att.get(thumb, {}).get('alt', '') if thumb else ''
    if featured:
        referenced.add(featured)

    cats = [html.unescape(c.text) for c in i.findall('category')
            if c.get('domain') == 'category']
    cat_slugs = [c.get('nicename') for c in i.findall('category')
                 if c.get('domain') == 'category']
    tags = [html.unescape(c.text) for c in i.findall('category')
            if c.get('domain') == 'post_tag']

    for k, v in meta.items():
        if k == '_wp_old_slug' and v:
            redirects.append({'source': f'/{v}/', 'destination': url_path,
                              'permanent': True})

    # plain-text excerpt for cards and meta description fallback
    plain = re.sub(r'<[^>]+>', ' ', body)
    plain = html.unescape(re.sub(r'\s+', ' ', plain)).strip()

    posts.append({
        'title': title, 'slug': slug, 'urlPath': url_path,
        'date': i.find('wp:post_date', NS).text or '',
        'modified': i.find('wp:post_modified', NS).text or '',
        'seoTitle': meta.get('_yoast_wpseo_title', ''),
        'description': meta.get('_yoast_wpseo_metadesc', '') or plain[:155],
        'focusKeyword': meta.get('_yoast_wpseo_focuskw', ''),
        'readingTime': meta.get('_yoast_wpseo_estimated-reading-time-minutes', ''),
        'featuredImage': featured, 'featuredAlt': featured_alt,
        'categories': cats, 'categorySlugs': cat_slugs, 'tags': tags,
        'excerpt': plain[:300],
        'body': body,
    })

posts.sort(key=lambda p: p['date'], reverse=True)

for p in posts:
    fm = ['---',
          f'title: {yq(p["title"])}',
          f'slug: {yq(p["slug"])}',
          f'urlPath: {yq(p["urlPath"])}',
          f'date: {yq(p["date"])}',
          f'modified: {yq(p["modified"])}',
          f'seoTitle: {yq(p["seoTitle"])}',
          f'description: {yq(p["description"])}',
          f'focusKeyword: {yq(p["focusKeyword"])}',
          f'readingTime: {yq(p["readingTime"])}',
          f'excerpt: {yq(p["excerpt"])}']
    if p['featuredImage']:
        fm.append(f'featuredImage: {yq(p["featuredImage"])}')
        fm.append(f'featuredAlt: {yq(p["featuredAlt"])}')
    fm.append('categories:')
    for c in p['categories']:
        fm.append(f'  - {yq(c)}')
    fm.append('categorySlugs:')
    for c in p['categorySlugs']:
        fm.append(f'  - {yq(c)}')
    fm.append('tags:')
    for t in p['tags']:
        fm.append(f'  - {yq(t)}')
    fm += ['---', '', p['body']]
    with open(os.path.join(POSTS_DIR, f'{p["slug"]}.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(fm))

# ---- categories -------------------------------------------------------------
counts = Counter()
for p in posts:
    for s in p['categorySlugs']:
        counts[s] += 1

cats = []
for c in root.findall('.//wp:category', NS):
    slug = c.find('wp:category_nicename', NS).text
    name = html.unescape(c.find('wp:cat_name', NS).text)
    desc = c.find('wp:category_description', NS)
    desc = html.unescape((desc.text or '').strip()) if desc is not None else ''
    cats.append({'slug': slug, 'name': name, 'description': desc,
                 'count': counts.get(slug, 0)})

with open(os.path.join(ROOT, 'content', 'categories.json'), 'w') as f:
    json.dump(cats, f, indent=2)
with open(os.path.join(ROOT, 'content', 'redirects.json'), 'w') as f:
    json.dump(redirects, f, indent=2)

# ---- images -----------------------------------------------------------------
# site chrome that templates reference directly, not via post content
EXTRA = [
    '/images/2025/07/blog-top-4-1.png',      # homepage hero
    '/images/2025/07/buyer-scaled.png',      # portrait card
    '/images/2025/07/seller-scaled.png',
    '/images/2025/07/blog-scaled.png',
    '/images/2025/07/Beat22-Logo-07.png',    # header logo
    '/images/2025/07/cropped-Beat22-Logo-ICO-25-scaled-1-192x192.png',  # favicon
    '/images/2025/07/cropped-Beat22-Logo-ICO-25-scaled-1-180x180.png',
]
for e in EXTRA:
    referenced.add(e)

copied = missing = 0
if UPLOADS:
    # map sanitised name -> real file on disk
    on_disk = {}
    for dirpath, _, files in os.walk(UPLOADS):
        for fn in files:
            full = os.path.join(dirpath, fn)
            rel = '/images/' + os.path.relpath(full, UPLOADS).replace(os.sep, '/')
            on_disk.setdefault(safe_path(rel), full)

    for rel in sorted(referenced):
        target = safe_path(rel)
        src = on_disk.get(target)
        if not src:
            for cand in disk_candidates(rel):
                p = os.path.join(UPLOADS, cand.replace('/images/', '', 1))
                if os.path.isfile(p):
                    src = p
                    break
        if src:
            dst = os.path.join(IMG_DIR, target.replace('/images/', '', 1))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)
            copied += 1
        else:
            missing += 1
            print(f'  missing image: {rel}')

print(json.dumps({
    'posts': len(posts),
    'categories': len([c for c in cats if c['count']]),
    'redirects': len(redirects),
    'imagesReferenced': len(referenced),
    'imagesCopied': copied,
    'imagesMissing': missing,
}, indent=2))
