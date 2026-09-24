#!/usr/bin/env python3
"""
Generate a WebP sibling for every raster image, and cap oversized originals.

  python3 scripts/optimize-images.py --check    report only
  python3 scripts/optimize-images.py --write    do it

Article bodies are injected as HTML, so body images never pass through
next/image and are served exactly as they sit on disk. The WordPress export is
full of 24-bit PNG screenshots — 2.6 MB for a 1500px screenshot — which is the
single heaviest thing on an article page and lands straight on Largest
Contentful Paint.

This writes `<name>.webp` next to each file. lib/markdoc.ts emits a <picture>
with the WebP first and the original as the fallback, so nothing breaks for a
browser that cannot take it and no content reference has to change.

Originals wider than MAX_WIDTH are resized in place: nothing on the site
displays wider than about 830px, so a 2249px screenshot is pure waste even
once it is WebP.

Safe to re-run: a WebP that is already newer than its source is skipped, and
an original already within MAX_WIDTH is left alone.
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, 'public', 'images')

# The article column is ~830px; 2x covers retina with room to spare.
MAX_WIDTH = 1600
WEBP_QUALITY = 82
SOURCE_EXT = ('.png', '.jpg', '.jpeg')

write = '--write' in sys.argv


def human(n):
    return f'{n / 1024 / 1024:.2f} MB' if n >= 1024 * 1024 else f'{n / 1024:.0f} KB'


def main():
    before = after = 0
    resized = converted = skipped = 0

    for dirpath, _, files in os.walk(IMG_DIR):
        for name in sorted(files):
            if not name.lower().endswith(SOURCE_EXT):
                continue

            src = os.path.join(dirpath, name)
            webp = os.path.splitext(src)[0] + '.webp'
            src_bytes = os.path.getsize(src)
            before += src_bytes

            if os.path.exists(webp) and os.path.getmtime(webp) >= os.path.getmtime(src):
                after += os.path.getsize(webp)
                skipped += 1
                continue

            try:
                with Image.open(src) as im:
                    im.load()

                    # Cap the original so the fallback is not absurd either.
                    if im.width > MAX_WIDTH:
                        ratio = MAX_WIDTH / im.width
                        target = (MAX_WIDTH, max(1, round(im.height * ratio)))
                        resampled = im.resize(target, Image.LANCZOS)
                        if write:
                            params = {'optimize': True}
                            if src.lower().endswith(('.jpg', '.jpeg')):
                                params.update(quality=88, progressive=True)
                            resampled.save(src, **params)
                        im = resampled
                        resized += 1

                    # WebP has no alpha limitation, so keep RGBA where present.
                    out = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
                    if write:
                        out.save(webp, 'WEBP', quality=WEBP_QUALITY, method=6)
                    converted += 1

                    if write:
                        after += os.path.getsize(webp)
                    else:
                        # Estimate without writing to disk.
                        import io

                        buf = io.BytesIO()
                        out.save(buf, 'WEBP', quality=WEBP_QUALITY, method=4)
                        after += buf.tell()
            except Exception as exc:  # pragma: no cover - reported, not fatal
                print(f'  skipped {src}: {exc}')
                after += src_bytes

    print(f'source images   : {converted + skipped}')
    print(f'webp written    : {converted}' + ('' if write else ' (estimated)'))
    print(f'already current : {skipped}')
    print(f'resized to {MAX_WIDTH}px: {resized}')
    print(f'weight          : {human(before)} -> {human(after)}'
          f'  ({100 - after * 100 // max(before, 1)}% smaller)')
    if not write:
        print('\nDry run. Re-run with --write to apply.')


if __name__ == '__main__':
    main()
