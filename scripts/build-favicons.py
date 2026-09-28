#!/usr/bin/env python3
"""
Rebuild the favicon set from the brand mark.

  python3 scripts/build-favicons.py

The icon inherited from WordPress has a black matte baked into it: 23% of the
192px source is opaque (0,0,0) where the B's bars should be negative space.
WordPress's favicon cropper flattened a transparent logo onto black. On the
white site header nobody noticed; in a browser tab the mark shows black bars
straight across it.

The black is removed by pushing each pixel toward white in proportion to how
far it already is from the brand purple. The purple is saturated in blue
(b ~= 255) and the matte is not, so the blue channel is a clean discriminator
and anti-aliased edges blend smoothly instead of leaving a dark fringe:

    new = c + (255 - c) * (1 - b/255)

Pure black becomes white, brand purple is untouched, and everything between
lands on the line joining them. The area outside the glyph stays transparent,
so the mark reads the same on light and dark browser chrome.

Apple touch icons get an opaque tile: iOS ignores transparency and composites
onto black itself, which is the bug this script exists to fix.

A real .ico is emitted too — Google's search-result favicon crawler wants one,
and it is what shows next to the domain in results.

Safe to re-run; it always regenerates from SOURCE.
"""
import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(
    ROOT, 'public', 'images', '2025', '07',
    'cropped-Beat22-Logo-ICO-25-scaled-1-192x192.png',
)
OUT_DIR = os.path.join(ROOT, 'public', 'images', 'brand')
TILE = (255, 255, 255)   # what iOS paints behind the mark


def strip_black_matte(img: Image.Image) -> Image.Image:
    img = img.convert('RGBA')
    px = img.load()
    w, h = img.size
    changed = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0 or b >= 250:
                continue
            k = 1 - b / 255
            px[x, y] = (
                round(r + (255 - r) * k),
                round(g + (255 - g) * k),
                round(b + (255 - b) * k),
                a,
            )
            changed += 1
    print(f'  pixels de-matted       : {changed}')
    return img


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    src = Image.open(SOURCE)
    print(f'  source                 : {os.path.relpath(SOURCE, ROOT)} {src.size}')

    base = strip_black_matte(src.convert('RGBA').resize((512, 512), Image.LANCZOS))

    written = []
    for size in (512, 192, 32):
        out = os.path.join(OUT_DIR, f'favicon-{size}.png')
        base.resize((size, size), Image.LANCZOS).save(out, optimize=True)
        written.append(out)

    tile = Image.new('RGBA', (180, 180), (*TILE, 255))
    mark = base.resize((152, 152), Image.LANCZOS)
    tile.paste(mark, (14, 14), mark)
    apple = os.path.join(OUT_DIR, 'apple-touch-icon.png')
    tile.convert('RGB').save(apple, optimize=True)
    written.append(apple)

    ico = os.path.join(ROOT, 'public', 'favicon.ico')
    base.save(ico, sizes=[(16, 16), (32, 32), (48, 48)])
    written.append(ico)

    for f in written:
        print(f'  wrote {os.path.relpath(f, ROOT):46} {os.path.getsize(f):>7} bytes')


if __name__ == '__main__':
    main()
