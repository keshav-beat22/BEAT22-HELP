#!/usr/bin/env python3
"""
Fill in empty image alt text from the step each screenshot illustrates.

  python3 scripts/derive-alt-text.py --check    report only
  python3 scripts/derive-alt-text.py --write    apply

Every image in the WordPress export came across with `alt=""`. Empty alt tells
a screen reader "this is decorative, skip it", which is wrong for a screenshot
that shows the reader exactly where to click, and it leaves the image invisible
to image search.

These screenshots sit directly under the instruction they illustrate, so the
preceding sentence is a fair description of what the picture shows. That is
what this uses.

Only empty alts are touched; anything already written is left alone, and the
script is safe to re-run.

The result is a large improvement over nothing, but it is derived text, not
authored text — worth a read-through in the admin, especially on the
highest-traffic articles.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS_DIR = os.path.join(ROOT, 'content', 'posts')

MAX_LEN = 110
write = '--write' in sys.argv


def clean(text):
    """Markdown and list scaffolding out, plain sentence in."""
    text = re.sub(r'!\[[^\]]*\]\([^)]*\)', ' ', text)      # nested images
    text = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', text)   # links -> label
    text = re.sub(r'\{%[^%]*%\}', ' ', text)               # markdoc tags
    text = re.sub(r'\\([\[\]()*_`#])', r'\1', text)          # unescape markdown
    text = re.sub(r'[*_`#>]+', '', text)                   # emphasis, headings
    text = text.replace('[', '').replace(']', '')          # would break ![alt](...)
    text = re.sub(r'^\s*(?:\d+\.|[-+*])\s*', '', text)     # list markers
    text = re.sub(r'\s+', ' ', text).strip()
    text = text.strip(' :–—-')
    if len(text) > MAX_LEN:
        cut = text[:MAX_LEN]
        space = cut.rfind(' ')
        text = (cut[:space] if space > 40 else cut).rstrip(' ,;:')
    return text


def describe(lines, index, fallback):
    """Nearest usable sentence above the image, else the article title."""
    for i in range(index - 1, max(-1, index - 6), -1):
        candidate = clean(lines[i])
        # Skip blanks and lines that are themselves only an image or a tag.
        if len(candidate) >= 12:
            return candidate
    return fallback


def main():
    total = filled = skipped = 0
    preview = []

    for name in sorted(os.listdir(POSTS_DIR)):
        if not name.endswith(('.mdoc', '.md')):
            continue
        path = os.path.join(POSTS_DIR, name)
        with open(path, encoding='utf-8') as f:
            raw = f.read()

        parts = raw.split('---', 2)
        if len(parts) < 3:
            continue
        front, body = parts[1], parts[2]

        title_match = re.search(r'^title:\s*(.+)$', front, re.M)
        title = (title_match.group(1).strip().strip('\'"') if title_match else '')

        lines = body.split('\n')
        changed = False

        for idx, line in enumerate(lines):
            if '![' not in line:
                continue

            def replace(match):
                nonlocal changed
                global_alt = match.group(1)
                if global_alt.strip():
                    return match.group(0)
                alt = describe(lines, idx, title)
                if not alt:
                    return match.group(0)
                changed = True
                if len(preview) < 6:
                    preview.append((name, alt))
                return f'![{alt}]({match.group(2)})'

            new_line, n = re.subn(r'!\[([^\]]*)\]\(([^)]+)\)', replace, line)
            total += n
            if new_line != line:
                lines[idx] = new_line

        if changed:
            filled += 1
            if write:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(f'---{front}---' + '\n'.join(lines))
        else:
            skipped += 1

    print(f'images seen        : {total}')
    print(f'articles updated   : {filled}')
    print(f'articles unchanged : {skipped}')
    if preview:
        print('\nsample alt text:')
        for name, alt in preview:
            print(f'  {name}\n    "{alt}"')
    if not write:
        print('\nDry run. Re-run with --write to apply.')


if __name__ == '__main__':
    main()
