const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(`${ROOT}/academy/index.html`, 'utf8');
const dataJs = fs.readFileSync(`${ROOT}/academy/data/data.js`, 'utf8');
const academyJs = fs.readFileSync(`${ROOT}/academy/academy.js`, 'utf8');

const dom = new JSDOM(html, { url: 'https://zuyini.com/academy/', runScripts: 'outside-only' });
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
dom.window.eval(dataJs + '\n' + academyJs);
const doc = dom.window.document;

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function courseSlug(name) {
  return slugify(name.replace(/^C\d{2,3}\s+/i, ''));
}
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function truncate(str, n) {
  str = (str || '').replace(/\s+/g, ' ').trim();
  if (str.length <= n) return str;
  var cut = str.slice(0, n - 1);
  var lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > n * 0.6) cut = cut.slice(0, lastSpace); // avoid cutting mid-word
  return cut.trim().replace(/[,;:.\-–—]+$/, '') + '…';
}

function navigate(pathname) {
  dom.window.history.pushState(null, '', pathname);
  dom.window.dispatchEvent(new dom.window.Event('popstate'));
}

function pageShell(opts) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(opts.title)}</title>
  <meta name="description" content="${escapeHtml(opts.description)}" />
  <link rel="canonical" href="${opts.canonical}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(opts.title)}" />
  <meta property="og:description" content="${escapeHtml(opts.description)}" />
  <meta property="og:image" content="https://zuyini.com/academy/og-image.png" />
  <meta property="og:url" content="${opts.canonical}" />
  <link rel="stylesheet" href="../../academy.css" />
  <link rel="stylesheet" href="../../../gate.css" />
</head>
<body>
  <header class="site-header">
    <a href="/index.html" class="logo">
      <span class="logo-mark">Z</span>
      <span>Zuyini Academy</span>
    </a>
    <nav class="nav-links">
      <a href="/index.html">Main Site</a>
      <a href="/health-sciences/index.html">Health Sciences</a>
      <a href="/newsletter/index.html">Newsletter</a>
      <a href="/academy/real-credentials/index.html">Verified Credentials</a>
      <a href="/index.html#about">About Manny</a>
    </nav>
  </header>

  <section class="academy-hero">
    <div class="hero-glow" aria-hidden="true"></div>
    <div class="hero-inner">
      <p class="section-label">Role-Driven Mastery System</p>
      <p class="hero-tagline-heading">Master the skills the job market is actually hiring for.</p>
      <p class="hero-description">Follow a job-market-audited Role Path, move through a discipline end-to-end with a Career Pathway, or pursue a university-benchmarked Academic Certificate &mdash; each with a Basic &rarr; Intermediate &rarr; Advanced ladder, direct video learning bridges and a capstone proof-of-work project.</p>
      <form id="skill-finder-form" class="skill-finder" novalidate>
        <input id="skill-finder-input" type="text" placeholder="What skill are you looking for? e.g. negotiation, Python, AI agents..." autocomplete="off" />
        <button type="submit">Find My Path</button>
      </form>
      <div class="hero-stats">
        <button type="button" class="hero-stat" data-hero-mode="roles">
          <span class="hero-stat-num" id="hero-stat-roles">${MODESLen('roles')}</span>
          <span class="hero-stat-label">Job-Benchmarked Roles</span>
        </button>
        <button type="button" class="hero-stat" data-hero-mode="pathways">
          <span class="hero-stat-num" id="hero-stat-pathways">${MODESLen('pathways')}</span>
          <span class="hero-stat-label">Career Pathways</span>
        </button>
        <button type="button" class="hero-stat" data-hero-mode="credentials">
          <span class="hero-stat-num" id="hero-stat-credentials">${MODESLen('certificates') + MODESLen('skills')}</span>
          <span class="hero-stat-label">Certificates &amp; Skill Tracks</span>
        </button>
        <button type="button" class="hero-stat" data-hero-mode="interview">
          <span class="hero-stat-num" id="hero-stat-interview">${MODESLen('interview')}</span>
          <span class="hero-stat-label">Interview Prep Tracks</span>
        </button>
      </div>
      <div class="inline-signup">
        <p class="inline-signup-heading">Get free access</p>
        <p class="inline-signup-pitch">Sign up with your name and email to unlock every video, course and mastery tracker across the Academy and Health Sciences Academy. No spam, unsubscribe anytime.</p>
        <form class="zuyini-inline-signup" novalidate>
          <div class="gate-field">
            <label for="hero-signup-name">Name</label>
            <input id="hero-signup-name" name="first_name" type="text" autocomplete="given-name" required />
          </div>
          <div class="gate-field">
            <label for="hero-signup-email">Email</label>
            <input id="hero-signup-email" name="email" type="email" autocomplete="email" required />
          </div>
          <button type="submit" class="gate-submit">Get Access</button>
          <p class="gate-error" hidden></p>
        </form>
        <p class="gate-success" hidden>You're in &mdash; every video, course and tracker is unlocked. Thanks for joining Zuyini!</p>
      </div>
    </div>
  </section>

  <div class="mode-toggle-bar">
    <div class="mode-toggle">
      <button type="button" data-mode="roles"${opts.mode === 'roles' ? ' class="active"' : ''}>Roles</button>
      <button type="button" data-mode="pathways"${opts.mode === 'pathways' ? ' class="active"' : ''}>Career Pathways</button>
      <button type="button" data-mode="credentials"${opts.mode === 'credentials' || opts.mode === 'certificates' || opts.mode === 'skills' ? ' class="active"' : ''}>Certificates &amp; Skill Tracks</button>
      <button type="button" data-mode="interview"${opts.mode === 'interview' ? ' class="active"' : ''}>Interview Prep</button>
      <button type="button" data-mode="mypathway"${opts.mode === 'mypathway' ? ' class="active"' : ''}>My Learning</button>
    </div>
  </div>

  <main class="app-shell">
    <aside class="role-panel" id="role-panel">
      <button type="button" id="role-panel-toggle" class="role-panel-toggle" aria-expanded="true">
        <span class="role-panel-toggle-icon" aria-hidden="true">&#9776;</span>
        <span class="role-panel-toggle-label">Hide list</span>
      </button>
      <select id="category-select" class="category-select"></select>
      <div class="search-box">
        <input id="search-input" type="text" placeholder="Search roles, e.g. AI Engineer, UX, Finance..." autocomplete="off" />
      </div>
      <p class="role-count"><span id="role-count-num">0</span> <span id="role-count-label">items</span></p>
      <ul id="role-list" class="role-list">${opts.staticList}</ul>
    </aside>

    <section class="role-detail" id="role-detail">
${opts.detailHtml}
    </section>
  </main>

  <footer>
    <div class="footer-links">
      <a href="/academy/index.html">Academy</a>
      <a href="/health-sciences/index.html">Health Sciences</a>
      <a href="/newsletter/index.html">Newsletter</a>
      <a href="/academy/real-credentials/index.html">Verified Credentials</a>
      <a href="/index.html">Zuyini Consulting</a>
      <a href="https://www.linkedin.com/in/emmanuelogbeide/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
      <a href="mailto:manny.ogbeide@gmail.com">Contact</a>
      <a href="/privacy.html">Privacy Policy</a>
    </div>
    <p>&copy; 2026 Zuyini Academy. Built by Manny Ogbeide.</p>
  </footer>

  <script src="../../data/data.js"></script>
  <script src="../../academy.js"></script>
  <script src="../../../gate.js"></script>
</body>
</html>
`;
}

const rolesData = JSON.parse(fs.readFileSync(`${ROOT}/academy/data/roles.json`, 'utf8'));
const pathwaysData = JSON.parse(fs.readFileSync(`${ROOT}/academy/data/pathways.json`, 'utf8'));
const certificatesData = JSON.parse(fs.readFileSync(`${ROOT}/academy/data/certificates.json`, 'utf8'));
const coursesData = JSON.parse(fs.readFileSync(`${ROOT}/academy/data/courses.json`, 'utf8'));
const interviewData = JSON.parse(fs.readFileSync(`${ROOT}/academy/data/interview-prep.json`, 'utf8'));
const skillsData = JSON.parse(fs.readFileSync(`${ROOT}/academy/data/skill-tracks.json`, 'utf8'));

function MODESLen(key) {
  var map = { roles: rolesData, pathways: pathwaysData, certificates: certificatesData, interview: interviewData, skills: skillsData };
  return map[key].length;
}

function writePage(outDir, contents) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), contents);
}

// Plain-HTML fallback for the sidebar list: the live app replaces this on
// load via renderList(), but a crawler reading the raw HTML (or anything
// that doesn't execute JS) previously saw an empty <ul> with no way to
// discover the other 158 roles/pathways/certificates from any given page.
// Baking in real <a href> links here also gives every static page genuine
// internal links to its siblings, not just a JS-only in-app list.
const MODE_PATHS = { roles: 'roles', pathways: 'pathways', certificates: 'certificates', interview: 'interview', skills: 'skills' };
function renderStaticList(mode) {
  var map = { roles: rolesData, pathways: pathwaysData, certificates: certificatesData, interview: interviewData, skills: skillsData };
  var data = map[mode] || [];
  var base = MODE_PATHS[mode] || 'roles';
  return data
    .slice()
    .sort(function (a, b) { return a.name.localeCompare(b.name); })
    .map(function (item) {
      var slug = slugify(item.name);
      return '<li data-slug="' + slug + '"><a href="/academy/' + base + '/' + slug + '/">' + escapeHtml(item.name) + '</a></li>';
    })
    .join('');
}

const urls = [];
const BASE_URL = 'https://zuyini.com';

// --- Roles ---
const roles = rolesData;
roles.forEach((role) => {
  const slug = slugify(role.name);
  navigate('/academy/roles/' + slug + '/');
  const detailHtml = doc.getElementById('role-detail').innerHTML.replace('<h2>', '<h1>').replace('</h2>', '</h1>');
  const canonical = `${BASE_URL}/academy/roles/${slug}/`;
  const page = pageShell({
    title: `${role.name} | Zuyini Academy`,
    description: truncate(role.benchmark || `Role-benchmarked mastery path for ${role.name}: core competencies, direct video bridges and a hands-on capstone.`, 155),
    canonical,
    mode: 'roles',
    staticList: renderStaticList('roles'),
    detailHtml,
  });
  writePage(`${ROOT}/academy/roles/${slug}`, page);
  urls.push(canonical);
});
console.log('roles generated:', roles.length);

// --- Pathways ---
const pathways = pathwaysData;
pathways.forEach((p) => {
  const slug = slugify(p.name);
  navigate('/academy/pathways/' + slug + '/');
  const detailHtml = doc.getElementById('role-detail').innerHTML.replace('<h2>', '<h1>').replace('</h2>', '</h1>');
  const canonical = `${BASE_URL}/academy/pathways/${slug}/`;
  const page = pageShell({
    title: `${p.name} | Zuyini Academy Career Pathway`,
    description: truncate(p.description || `An end-to-end career pathway covering ${p.name}.`, 155),
    canonical,
    mode: 'pathways',
    staticList: renderStaticList('pathways'),
    detailHtml,
  });
  writePage(`${ROOT}/academy/pathways/${slug}`, page);
  urls.push(canonical);
});
console.log('pathways generated:', pathways.length);

// --- Certificates ---
const certs = certificatesData;
certs.forEach((c) => {
  const slug = slugify(c.name);
  navigate('/academy/certificates/' + slug + '/');
  const detailHtml = doc.getElementById('role-detail').innerHTML.replace('<h2>', '<h1>').replace('</h2>', '</h1>');
  const canonical = `${BASE_URL}/academy/certificates/${slug}/`;
  const page = pageShell({
    title: `${c.name} | Zuyini Academy`,
    description: truncate(c.description || `A university-benchmarked academic certificate: ${c.name}.`, 155),
    canonical,
    mode: 'certificates',
    staticList: renderStaticList('certificates'),
    detailHtml,
  });
  writePage(`${ROOT}/academy/certificates/${slug}`, page);
  urls.push(canonical);
});
console.log('certificates generated:', certs.length);

// --- Courses ---
const courses = coursesData;
courses.forEach((course) => {
  const slug = courseSlug(course.name);
  navigate('/academy/courses/' + slug + '/');
  const detailHtml = doc.getElementById('role-detail').innerHTML.replace('<h2>', '<h1>').replace('</h2>', '</h1>');
  const canonical = `${BASE_URL}/academy/courses/${slug}/`;
  const page = pageShell({
    title: `${course.name} | Zuyini Academy Course`,
    description: truncate(course.description || `Video-based course: ${course.name}.`, 155),
    canonical,
    mode: 'roles',
    staticList: renderStaticList('roles'),
    detailHtml,
  });
  writePage(`${ROOT}/academy/courses/${slug}`, page);
  urls.push(canonical);
});
console.log('courses generated:', courses.length);

// --- Interview Prep tracks ---
const interviewTracks = interviewData;
interviewTracks.forEach((t) => {
  const slug = slugify(t.name);
  navigate('/academy/interview/' + slug + '/');
  const detailHtml = doc.getElementById('role-detail').innerHTML.replace('<h2>', '<h1>').replace('</h2>', '</h1>');
  const canonical = `${BASE_URL}/academy/interview/${slug}/`;
  const page = pageShell({
    title: `${t.name} Interview Prep | Zuyini Academy`,
    description: truncate(t.benchmark || `Benchmarked interview preparation track for ${t.name}: mock interviews, a timed practice loop and a pass rubric.`, 155),
    canonical,
    mode: 'interview',
    staticList: renderStaticList('interview'),
    detailHtml,
  });
  writePage(`${ROOT}/academy/interview/${slug}`, page);
  urls.push(canonical);
});
console.log('interview prep tracks generated:', interviewTracks.length);

// --- Skill Tracks ---
const skillTracks = skillsData;
skillTracks.forEach((t) => {
  const slug = slugify(t.name);
  navigate('/academy/skills/' + slug + '/');
  const detailHtml = doc.getElementById('role-detail').innerHTML.replace('<h2>', '<h1>').replace('</h2>', '</h1>');
  const canonical = `${BASE_URL}/academy/skills/${slug}/`;
  const page = pageShell({
    title: `${t.name} | Zuyini Academy Skill Track`,
    description: truncate(t.tagline || t.intro || `A hands-on mastery route: ${t.name}.`, 155),
    canonical,
    mode: 'skills',
    staticList: renderStaticList('skills'),
    detailHtml,
  });
  writePage(`${ROOT}/academy/skills/${slug}`, page);
  urls.push(canonical);
});
console.log('skill tracks generated:', skillTracks.length);

// --- My Pathway (client-side, localStorage-only content -- this static
// page exists only so direct navigation/refresh at /academy/mypathway/
// doesn't 404; the JS immediately re-renders it from the visitor's own
// saved data on load, same as the landing page's baked empty state) ---
{
  // the traversal above visited every role/pathway/cert/course/interview/
  // skill page in this same JSDOM session, which populated Recently
  // Viewed via each page's own recordView() call -- clear it so the
  // static fallback shows a genuinely empty state, matching what a real
  // first-time visitor's browser actually has
  dom.window.localStorage.removeItem('zuyini_recently_viewed');
  dom.window.localStorage.removeItem('zuyini_my_pathway');
  navigate('/academy/mypathway/');
  const detailHtml = doc.getElementById('role-detail').innerHTML.replace('<h2>', '<h1>').replace('</h2>', '</h1>');
  const canonical = `${BASE_URL}/academy/mypathway/`;
  const page = pageShell({
    title: 'My Learning | Zuyini Academy',
    description: 'Your personal hub for Zuyini Academy: build a custom learning path from Roles, Career Pathways, Certificates, Interview Prep tracks, Bootcamp & Skill Tracks and Courses, reorder or remove items, and pick up your Recently Viewed history -- all saved locally in your browser.',
    canonical,
    mode: 'mypathway',
    staticList: renderStaticList('roles'),
    detailHtml,
  });
  writePage(`${ROOT}/academy/mypathway`, page);
  urls.push(canonical);
  console.log('my pathway page generated');
}

fs.writeFileSync(`${ROOT}/.static-academy-urls.json`, JSON.stringify(urls, null, 2));
console.log('total URLs:', urls.length);

// Defensive: ensures this script always terminates once generation is
// done, regardless of anything evaluated into the jsdom window above.
process.exit(0);
