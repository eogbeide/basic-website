// Builds academy/data/app-catalog.json: a slim index of every Academy page
// for the Zuyini mobile app's in-app Academy. The full data files are several
// megabytes, which is too much for a phone to download, so this keeps only
// what a list or search screen needs. Slugs must match
// generate_static_academy.js exactly, or the app links to missing pages.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (f) => JSON.parse(fs.readFileSync(`${ROOT}/academy/data/${f}.json`, 'utf8'));

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function courseSlug(name) {
  return slugify(name.replace(/^C\d{2,3}\s+/i, ''));
}
function short(str, n) {
  str = String(str || '').replace(/\s+/g, ' ').trim();
  if (str.length <= n) return str;
  const cut = str.slice(0, n - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[,;:.\-–—]+$/, '') + '…';
}

const SECTIONS = [
  { type: 'role', file: 'roles', dir: 'roles', slug: slugify, blurb: (x) => x.category, cat: (x) => x.category },
  { type: 'pathway', file: 'pathways', dir: 'pathways', slug: slugify, blurb: (x) => x.description, cat: (x) => x.category },
  { type: 'certificate', file: 'certificates', dir: 'certificates', slug: slugify, blurb: (x) => x.description, cat: (x) => x.category },
  { type: 'course', file: 'courses', dir: 'courses', slug: courseSlug, blurb: (x) => x.description, cat: () => '' },
  { type: 'interview', file: 'interview-prep', dir: 'interview', slug: slugify, blurb: (x) => x.subtitle, cat: () => 'Interview Prep' },
  { type: 'skill', file: 'skill-tracks', dir: 'skills', slug: slugify, blurb: (x) => x.tagline, cat: (x) => x.category },
];

const items = [];
const missing = [];
for (const s of SECTIONS) {
  for (const x of read(s.file)) {
    const url = `/academy/${s.dir}/${s.slug(x.name)}/`;
    if (!fs.existsSync(path.join(ROOT, url, 'index.html'))) missing.push(url);
    items.push({ type: s.type, name: x.name, category: s.cat(x) || '', blurb: short(s.blurb(x), 140), url });
  }
}

if (missing.length) {
  console.error(`app catalog: ${missing.length} URLs have no page, e.g. ${missing.slice(0, 3).join(', ')}`);
  process.exit(1);
}

const out = { version: 1, base: 'https://zuyini.com', count: items.length, items };
fs.writeFileSync(`${ROOT}/academy/data/app-catalog.json`, JSON.stringify(out));
console.log(`app catalog: ${items.length} items, ${fs.statSync(`${ROOT}/academy/data/app-catalog.json`).size} bytes`);
