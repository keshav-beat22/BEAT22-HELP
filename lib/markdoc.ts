import fs from 'node:fs';
import path from 'node:path';
import { imageSize } from 'image-size';
import Markdoc, { type Config, type Node } from '@markdoc/markdoc';

const PUBLIC_DIR = path.join(process.cwd(), 'public');

/** Measured once per file per build; the content set is static. */
const dimensionCache = new Map<string, { width: number; height: number } | null>();
const webpCache = new Map<string, string | null>();

/**
 * The WebP sibling written by scripts/optimize-images.py, if there is one.
 *
 * Body images are injected as HTML and never pass through next/image, so the
 * file on disk is exactly what ships. The WordPress export is 24-bit PNG
 * screenshots — 47 MB in total, against 3.4 MB as WebP — which is the heaviest
 * thing on an article page and lands directly on Largest Contentful Paint.
 */
function webpSibling(src: string): string | null {
  if (webpCache.has(src)) return webpCache.get(src) ?? null;

  let result: string | null = null;
  if (/\.(png|jpe?g)$/i.test(src) && src.startsWith('/') && !src.startsWith('//')) {
    const candidate = src.replace(/\.(png|jpe?g)$/i, '.webp');
    try {
      const file = path.join(PUBLIC_DIR, decodeURIComponent(candidate));
      if (file.startsWith(PUBLIC_DIR) && fs.existsSync(file)) result = candidate;
    } catch {
      // Unreadable path: fall back to the original.
    }
  }
  webpCache.set(src, result);
  return result;
}

/**
 * Real pixel dimensions for a local image.
 *
 * Markdown's `![alt](src)` cannot carry width and height, but omitting them
 * makes the page reflow as each image loads, which is a Core Web Vitals
 * penalty. Reading them off disk at build time is both automatic and more
 * reliable than asking an author to type them.
 */
function measure(src: string) {
  if (dimensionCache.has(src)) return dimensionCache.get(src) ?? null;

  let result: { width: number; height: number } | null = null;
  if (src.startsWith('/') && !src.startsWith('//')) {
    try {
      const file = path.join(PUBLIC_DIR, decodeURIComponent(src));
      // Stay inside public/ — a crafted path must not read elsewhere.
      if (file.startsWith(PUBLIC_DIR) && fs.existsSync(file)) {
        const { width, height } = imageSize(fs.readFileSync(file));
        if (width && height) result = { width, height };
      }
    } catch {
      // Unreadable or unsupported format: fall through without dimensions.
    }
  }
  dimensionCache.set(src, result);
  return result;
}

/** Pulls the 11-character id out of any common YouTube URL, or passes an id through. */
export function youTubeId(input: string): string | null {
  const value = input.trim();
  if (/^[\w-]{11}$/.test(value)) return value;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube-nocookie\.com\/embed\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = value.match(re);
    if (m) return m[1];
  }
  return null;
}

const config: Config = {
  nodes: {
    // Add lazy loading and real dimensions to every body image.
    image: {
      ...Markdoc.nodes.image,
      transform(node, cfg) {
        const attrs = node.transformAttributes(cfg);
        const src = String(attrs.src ?? '');
        const size = measure(src);
        const webp = webpSibling(src);

        const img = new Markdoc.Tag('img', {
          ...attrs,
          alt: attrs.alt ?? '',
          loading: 'lazy',
          decoding: 'async',
          ...(size ? { width: size.width, height: size.height } : {}),
        });

        if (!webp) return img;

        // <picture> lets a modern browser take the WebP while anything older
        // still gets the original, with no change to the content reference.
        return new Markdoc.Tag('picture', {}, [
          new Markdoc.Tag('source', { srcset: webp, type: 'image/webp' }),
          img,
        ]);
      },
    },

    // Headings inside an article body start at <h3>: <h1> is the article
    // title and <h2> belongs to the page furniture.
    heading: {
      ...Markdoc.nodes.heading,
      transform(node, cfg) {
        const attrs = node.transformAttributes(cfg);
        const children = node.transformChildren(cfg);
        const level = Math.min(6, Number(attrs.level ?? 2) + 1);
        return new Markdoc.Tag(`h${level}`, {}, children);
      },
    },
  },

  tags: {
    /**
     * {% youtube url="https://youtu.be/ID" title="..." /%}
     *
     * Renders the placeholder that components/YouTubeEmbeds.tsx upgrades to a
     * click-to-load player. An unrecognised URL renders nothing rather than a
     * broken frame.
     */
    youtube: {
      render: 'div',
      selfClosing: true,
      attributes: {
        url: { type: String, required: true },
        title: { type: String, required: false },
      },
      transform(node, cfg) {
        const attrs = node.transformAttributes(cfg);
        const id = youTubeId(String(attrs.url ?? ''));
        if (!id) return null;
        return new Markdoc.Tag('div', {
          class: 'yt-embed',
          'data-video-id': id,
          'data-title': String(attrs.title ?? 'YouTube video'),
        });
      },
    },
  },
};

/** Markdoc source to HTML, for injection into the article body. */
export function renderMarkdoc(source: string): string {
  const ast: Node = Markdoc.parse(source);
  const content = Markdoc.transform(ast, config);
  const html = Markdoc.renderers.html(content);
  // The html renderer wraps everything in <article>; the page supplies its own.
  return html.replace(/^<article>/, '').replace(/<\/article>$/, '');
}
