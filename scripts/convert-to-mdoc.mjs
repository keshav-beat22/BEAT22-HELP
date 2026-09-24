/**
 * Convert the WordPress-era articles from .md (raw HTML body) to .mdoc
 * (Markdown body) so the admin editor can open and edit them.
 *
 *   node scripts/convert-to-mdoc.mjs --check     report only, write nothing
 *   node scripts/convert-to-mdoc.mjs --write     perform the conversion
 *
 * Markdoc escapes raw HTML rather than passing it through, so a rename alone
 * would render the old articles as visible tag soup. The bodies have to become
 * real Markdown.
 *
 * Every file is verified before it is written: the visible text, and the count
 * of headings, links, images and list items, must survive the round trip.
 * Anything that does not match is reported and left as .md.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import Markdoc from '@markdoc/markdoc';
import domino from '@mixmark-io/domino';

const POSTS = path.join(process.cwd(), 'content', 'posts');
const write = process.argv.includes('--write');

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
});
turndown.use(gfm);

// WordPress wraps captions in <figure>/<div class="wp-caption">; keep the
// caption as a paragraph under the image rather than dropping it.
turndown.addRule('caption', {
  filter: (node) =>
    node.nodeName === 'FIGCAPTION' ||
    (node.getAttribute && /wp-caption-text/.test(node.getAttribute('class') || '')),
  replacement: (content) => (content.trim() ? `\n\n*${content.trim()}*\n\n` : ''),
});

/**
 * Repair the source HTML before converting.
 *
 * Some WordPress bodies contain an unclosed `<strong>`, and others fragment a
 * bold run across `<strong style="...">` and `<span style="...">` siblings.
 * Both produce broken emphasis markers in the Markdown. Round-tripping through
 * a real DOM auto-closes the tags, and dropping presentational attributes lets
 * the neighbouring runs merge.
 */
function normaliseHtml(html) {
  const doc = domino.createDocument(`<body>${html}</body>`, true);
  const root = doc.body;
  const all = (sel) => Array.prototype.slice.call(root.querySelectorAll(sel));

  for (const el of all('[style]')) el.removeAttribute('style');

  // A <span> with nothing left on it is pure noise; unwrap it.
  for (const span of all('span')) {
    if (span.attributes.length === 0) {
      while (span.firstChild) span.parentNode.insertBefore(span.firstChild, span);
      span.parentNode.removeChild(span);
    }
  }

  // Promote inline images to their own block.
  //
  // WordPress put screenshots inside the list item they illustrate, so
  // turndown emits `1. Do the thing ![](/images/x.png)` — valid Markdown, but
  // Keystatic only renders block-level images, so in the editor they show as
  // raw text that cannot be moved or replaced. Lifting each image into its own
  // paragraph inside the same block keeps it where it belongs and makes it a
  // real, draggable block.
  const INLINE = new Set(['STRONG', 'B', 'EM', 'I', 'A', 'SPAN', 'U', 'SMALL']);
  for (const img of all('img')) {
    let node = img;
    // Climb out of any inline wrappers; a <p> may not live inside <strong>.
    while (node.parentNode && INLINE.has(node.parentNode.nodeName)) {
      node = node.parentNode;
    }
    const host = node.parentNode;
    if (!host) continue;
    if (host.nodeName === 'P' && host.childNodes.length === 1) continue;
    if (host.nodeName === 'FIGURE') continue;

    const wrapper = doc.createElement('p');
    host.insertBefore(wrapper, node.nextSibling);
    wrapper.appendChild(img);

    // Drop the inline wrapper if lifting the image emptied it.
    if (node !== img && !(node.textContent || '').trim() && !node.querySelector('img')) {
      node.parentNode.removeChild(node);
    }
  }

  // Emphasis carrying no word characters is meaningless, and CommonMark will
  // not open a run next to punctuation, so it would leave a literal `**` on the
  // page. One body has an unclosed <strong> that the parser auto-closes around
  // a full stop and an image; unwrapping it here is both correct and safer than
  // pattern-matching the markup.
  for (const el of all('strong, b, em, i')) {
    if (!/[A-Za-z0-9]/.test(el.textContent || '')) {
      while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
      el.parentNode.removeChild(el);
    }
  }

  // An opening bracket left inside a bold run ("<strong>Dots (</strong>")
  // makes the closing `**` illegal, so the asterisks survive into the page.
  // Push stray brackets and whitespace out to the correct side.
  for (const el of all('strong, b, em, i')) {
    const first = el.firstChild;
    if (first && first.nodeType === 3) {
      const m = first.nodeValue.match(/^([\s)\]}]+)/);
      if (m) {
        first.nodeValue = first.nodeValue.slice(m[1].length);
        el.parentNode.insertBefore(doc.createTextNode(m[1]), el);
      }
    }
    const last = el.lastChild;
    if (last && last.nodeType === 3) {
      const m = last.nodeValue.match(/([\s([{]+)$/);
      if (m) {
        last.nodeValue = last.nodeValue.slice(0, -m[1].length);
        el.parentNode.insertBefore(doc.createTextNode(m[1]), el.nextSibling);
      }
    }
    if (!(el.textContent || '').trim()) {
      while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
      el.parentNode.removeChild(el);
    }
  }

  return root.innerHTML;
}

/**
 * Move whitespace out of inline emphasis before converting.
 *
 * WordPress produced markup like `<strong>Click the dots (</strong>`. Turndown
 * renders that literally as `**Click the dots (**`, and CommonMark will not
 * open or close emphasis next to a space, so the asterisks end up visible on
 * the page. Tightening the tags first makes the markers parse.
 */
function tightenEmphasis(html) {
  let out = html;
  for (let i = 0; i < 3; i++) {
    out = out.replace(
      /<(strong|b|em|i)>([\s]*)([\s\S]*?)([\s]*)<\/\1>/gi,
      (match, tag, lead, inner, trail) => {
        if (!inner.trim()) return `${lead}${inner}${trail}`;
        return `${lead}<${tag}>${inner}</${tag}>${trail}`;
      },
    );
  }
  // Collapse adjacent emphasis runs that turndown would emit as `**` + `**`.
  out = out.replace(/<\/(strong|b|em|i)>(\s*)<\1>/gi, '$2');

  // Emphasis around nothing but punctuation carries no meaning, and CommonMark
  // refuses to open a run next to punctuation, so `coding<strong>.</strong>`
  // would leave a literal `**.**` on the page. Unwrap it.
  out = out.replace(
    /<(strong|b|em|i)>([^<>A-Za-z0-9]*)<\/\1>/gi,
    (match, tag, inner) => inner,
  );

  return out;
}

/** Visible text, whitespace-normalised, for comparing before and after. */
const textOf = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;|&#8220;|&#8221;/g, '"')
    .replace(/&#8217;|&#039;|&rsquo;|&#8216;|&lsquo;/g, "'")
    .replace(/&#8211;|&ndash;/g, '-')
    .replace(/[\s ]+/g, ' ')
    .trim();

const counts = (html) => ({
  headings: (html.match(/<h[1-6][\s>]/gi) || []).length,
  links: (html.match(/<a\s[^>]*href=/gi) || []).length,
  images: (html.match(/<img[\s>]/gi) || []).length,
  listItems: (html.match(/<li[\s>]/gi) || []).length,
});

const files = fs.readdirSync(POSTS).filter((f) => f.endsWith('.md'));
const ok = [];
const failed = [];

for (const file of files) {
  const raw = fs.readFileSync(path.join(POSTS, file), 'utf8');
  const parsed = matter(raw);
  const original = parsed.content.trim();

  let markdown;
  try {
    markdown = turndown.turndown(tightenEmphasis(normaliseHtml(original)));
  } catch (e) {
    failed.push({ file, why: `turndown threw: ${e.message}` });
    continue;
  }

  // Render the Markdown back to HTML the way the site will.
  const rendered = Markdoc.renderers.html(Markdoc.transform(Markdoc.parse(markdown)));

  // Compared with whitespace removed: turndown legitimately normalises spacing
  // around inline tags, and that is not a content change. Structure is checked
  // separately by the element counts below, and any stray `**` left by a
  // mis-parsed emphasis run still shows up here as a difference.
  const beforeText = textOf(original).replace(/\s+/g, '');
  const afterText = textOf(rendered).replace(/\s+/g, '');
  const a = counts(original);
  const b = counts(rendered);

  const problems = [];
  if (beforeText !== afterText) {
    // Locate the first divergence to make the report actionable.
    let i = 0;
    while (i < beforeText.length && beforeText[i] === afterText[i]) i++;
    problems.push(
      `text differs at char ${i}\n        was: ...${beforeText.slice(Math.max(0, i - 40), i + 60)}...\n        now: ...${afterText.slice(Math.max(0, i - 40), i + 60)}...`,
    );
  }
  for (const k of ['headings', 'links', 'images', 'listItems']) {
    if (a[k] !== b[k]) problems.push(`${k}: ${a[k]} -> ${b[k]}`);
  }

  if (problems.length) {
    failed.push({ file, why: problems.join('\n      ') });
    continue;
  }

  ok.push({ file, markdown, data: parsed.data });
}

console.log(`articles checked : ${files.length}`);
console.log(`convert cleanly  : ${ok.length}`);
console.log(`need attention   : ${failed.length}`);

if (failed.length) {
  console.log('\nNot converted (left as .md, still renders exactly as today):');
  for (const f of failed) console.log(`  - ${f.file}\n      ${f.why}`);
}

if (!write) {
  console.log('\nDry run. Re-run with --write to convert the clean ones.');
  process.exit(0);
}

for (const { file, markdown, data } of ok) {
  const front = matter.stringify(`\n${markdown}\n`, data);
  const target = path.join(POSTS, file.replace(/\.md$/, '.mdoc'));
  fs.writeFileSync(target, front, 'utf8');
  fs.unlinkSync(path.join(POSTS, file));
}
console.log(`\nConverted ${ok.length} file(s) to .mdoc.`);
