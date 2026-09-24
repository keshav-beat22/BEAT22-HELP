/**
 * Normalise article dates to the ISO minute form the admin can edit.
 *
 *   node scripts/normalise-dates.mjs --check | --write
 *
 * The WordPress export wrote "2025-06-19 17:32:48". Keystatic's datetime field
 * accepts only "YYYY-MM-DDTHH:mm", so both date fields rendered empty in the
 * editor on every migrated article — blank, and marked required.
 *
 * Minute precision is enough to keep ordering: 17 articles share a day, but
 * only three share a minute, and Array.sort is stable so those three keep a
 * deterministic order. `urlPath` is stored explicitly, so no URL can move.
 */
import fs from 'node:fs';
import path from 'node:path';

const POSTS = path.join(process.cwd(), 'content', 'posts');
const write = process.argv.includes('--write');
const FIELDS = ['date', 'modified'];

let changed = 0;
const samples = [];

for (const file of fs.readdirSync(POSTS).filter((f) => /\.(mdoc|md)$/.test(f))) {
  const p = path.join(POSTS, file);
  let text = fs.readFileSync(p, 'utf8');
  const before = text;

  for (const field of FIELDS) {
    text = text.replace(
      new RegExp(`^(${field}: )'?"?(\\d{4}-\\d{2}-\\d{2})[ T](\\d{2}:\\d{2})(?::\\d{2})?'?"?$`, 'm'),
      (_m, key, day, hm) => `${key}'${day}T${hm}'`,
    );
    // A bare date with no time at all still needs the T form.
    text = text.replace(
      new RegExp(`^(${field}: )'?"?(\\d{4}-\\d{2}-\\d{2})'?"?$`, 'm'),
      (_m, key, day) => `${key}'${day}T09:00'`,
    );
  }

  if (text !== before) {
    changed++;
    if (samples.length < 3) {
      samples.push([file, /^date: .*$/m.exec(before)?.[0], /^date: .*$/m.exec(text)?.[0]]);
    }
    if (write) fs.writeFileSync(p, text);
  }
}

console.log(`files changed: ${changed}`);
samples.forEach(([f, a, b]) => console.log(`  ${f}\n    ${a}  ->  ${b}`));
if (!write) console.log('\nDry run. Re-run with --write to apply.');
