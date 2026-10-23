(function () {
  // Zero-cost Zuyini Assistant: no API calls, no LLM. It works from the
  // catalogs academy.js already loads on every page (ROLES_DATA,
  // PATHWAYS_DATA, CERTIFICATES_DATA, SKILL_TRACKS_DATA, COURSES_DATA,
  // INTERVIEW_PREP_DATA) and holds a short conversation:
  //   - guided flows for a career change, a new job, growing in a current
  //     role and interview prep: a few quick questions, then ranked roles
  //     with a % match, the reasons, a time plan and follow-ups;
  //   - answers about any role (skills needed, what you'll learn, how long);
  //   - answers to common questions about the site (cost, sign-up,
  //     credentials, time, job alerts, the app);
  //   - plain search, with a % match, for everything else.
  // The conversation, its context and the open/minimized state persist in
  // sessionStorage so they survive moving between the site's static pages.

  function slugify(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function courseSlug(name) {
    return slugify(String(name).replace(/^C\d{2,3}\s+/i, ''));
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function shortName(name) {
    return String(name).split(' / ')[0];
  }

  function clip(str, n) {
    str = String(str || '').replace(/\s+/g, ' ').trim();
    return str.length > n ? str.slice(0, n - 3).replace(/\s+\S*$/, '') + '...' : str;
  }

  // ---- search index -------------------------------------------------------

  var STOPWORDS = { 'a': 1, 'an': 1, 'and': 1, 'are': 1, 'as': 1, 'at': 1, 'be': 1, 'by': 1, 'can': 1, 'do': 1, 'does': 1, 'for': 1, 'from': 1, 'get': 1, 'have': 1, 'how': 1, 'i': 1, 'im': 1, 'in': 1, 'into': 1, 'is': 1, 'it': 1, 'like': 1, 'me': 1, 'my': 1, 'of': 1, 'on': 1, 'or': 1, 'so': 1, 'that': 1, 'the': 1, 'this': 1, 'to': 1, 'what': 1, 'which': 1, 'with': 1, 'would': 1, 'you': 1, 'your': 1, 'about': 1, 'find': 1, 'show': 1, 'want': 1, 'need': 1, 'some': 1, 'any': 1, 'good': 1, 'best': 1, 'job': 1, 'jobs': 1, 'work': 1, 'career': 1, 'new': 1, 'become': 1, 'currently': 1, 'now': 1, 'am': 1, 'was': 1, 'there': 1,
    // catalog-noise words: nearly every item's name ends in one of these,
    // so scoring them would bury the word that actually matters.
    'certificate': 1, 'certificates': 1, 'certification': 1, 'certifications': 1,
    'course': 1, 'courses': 1, 'bootcamp': 1, 'bootcamps': 1, 'track': 1, 'tracks': 1,
    'program': 1, 'programs': 1, 'mastery': 1, 'class': 1, 'classes': 1, 'training': 1,
    'learn': 1, 'learning': 1, 'role': 1, 'roles': 1, 'pathway': 1, 'pathways': 1, 'skills': 1, 'skill': 1 };

  // Common shorthand, expanded before searching.
  var SYNONYMS = {
    'pm': 'product manager', 'tpm': 'technical program manager', 'swe': 'software engineer', 'sde': 'software engineer',
    'ml': 'machine learning', 'ds': 'data scientist', 'ux': 'ux design', 'ui': 'ui design', 'qa': 'quality testing',
    'genai': 'generative ai', 'llm': 'llm ai', 'llms': 'llm ai', 'devops': 'devops platform', 'sre': 'site reliability',
    'bi': 'business intelligence', 'hr': 'people human resources', 'cfo': 'finance', 'fp&a': 'finance planning analysis',
    'coding': 'software', 'programming': 'software', 'programmer': 'software engineer', 'developer': 'developer engineer',
    'cyber': 'security', 'cybersecurity': 'security', 'nurse': 'healthcare clinical', 'nursing': 'healthcare clinical',
    'doctor': 'healthcare clinical', 'teacher': 'education training enablement', 'teaching': 'education training enablement',
    'sales': 'sales revenue', 'marketing': 'marketing growth', 'analyst': 'analyst analytics', 'analytics': 'analytics',
  };

  function stem(t) {
    if (t.length > 4 && /ies$/.test(t)) return t.slice(0, -3) + 'y';
    if (t.length > 3 && /s$/.test(t) && !/ss$/.test(t)) return t.slice(0, -1);
    return t;
  }

  function tokenize(text) {
    var out = [];
    String(text).toLowerCase().split(/[^a-z0-9+&]+/).forEach(function (t) {
      if (t.length < 2 || STOPWORDS[t]) return;
      var syn = SYNONYMS[t];
      (syn ? syn.split(' ') : [t]).forEach(function (s) {
        s = stem(s);
        if (s.length > 1 && !STOPWORDS[s] && out.indexOf(s) === -1) out.push(s);
      });
    });
    return out;
  }

  function competencyText(levels) {
    var parts = [];
    (levels || []).forEach(function (lvl) {
      parts.push(lvl.intro);
      (lvl.competencies || []).forEach(function (c) { parts.push(c.title, c.coverage, c.practice); });
    });
    return parts.join(' ');
  }

  var index = null;
  function buildIndex() {
    var out = [];
    function add(arr, type, label, base, slugFn, nameOf, snippetOf, blobOf) {
      if (!Array.isArray(arr)) return;
      arr.forEach(function (item) {
        out.push({
          type: type,
          label: label,
          item: item,
          name: nameOf(item),
          url: base + (item.slug || slugFn(nameOf(item))) + '/',
          snippet: snippetOf(item),
          nameLower: nameOf(item).toLowerCase(),
          blob: blobOf(item).toLowerCase(),
        });
      });
    }
    var n = function (i) { return String(i.name || ''); };
    add(window.ROLES_DATA, 'role', 'Role', '/academy/roles/', slugify, n,
      function (i) { return i.benchmark; },
      function (i) { return [i.name, i.category, i.benchmark, i.capstone, competencyText(i.levels)].join(' '); });
    add(window.PATHWAYS_DATA, 'pathway', 'Career Pathway', '/academy/pathways/', slugify, n,
      function (i) { return i.description; },
      function (i) { return [i.name, i.description, i.market_basis, (i.representative_roles || []).join(' ')].join(' '); });
    add(window.CERTIFICATES_DATA, 'certificate', 'Academic Certificate', '/academy/certificates/', slugify, n,
      function (i) { return i.description; },
      function (i) { return [i.name, i.description, i.category, i.university_benchmark].join(' '); });
    add(window.SKILL_TRACKS_DATA, 'skill', 'Skill Track', '/academy/skills/', slugify, n,
      function (i) { return i.tagline || i.intro; },
      function (i) { return [i.name, i.category, i.tagline, i.intro, i.benchmark].join(' '); });
    add(window.COURSES_DATA, 'course', 'Course', '/academy/courses/', courseSlug, n,
      function (i) { return i.description; },
      function (i) { return [i.name, i.description].join(' '); });
    add(window.INTERVIEW_PREP_DATA, 'interview', 'Interview Prep', '/academy/interview/', slugify, n,
      function (i) { return i.subtitle || i.benchmark; },
      function (i) { return [i.name, i.subtitle, i.benchmark, i.relatedRole, competencyText(i.levels)].join(' '); });
    return out;
  }

  // Same scoring as the Find Your Path matcher in academy.js: a word in the
  // name counts most, mentions in the rest count a little (capped), and the
  // % match is the share of the best possible score.
  var NAME_WEIGHT = 12;
  var BLOB_WEIGHT = 2;
  var BLOB_CAP = 5;
  var MAX_PER_WORD = NAME_WEIGHT + BLOB_WEIGHT * BLOB_CAP;

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function scoreEntry(words, entry, phrase) {
    var score = 0;
    var matched = [];
    words.forEach(function (w) {
      var re = new RegExp('\\b' + escapeRegExp(w), 'g');
      var hit = false;
      if (re.test(entry.nameLower)) { score += NAME_WEIGHT; hit = true; }
      var m = entry.blob.match(re);
      if (m) { score += Math.min(m.length, BLOB_CAP) * BLOB_WEIGHT; hit = true; }
      if (hit) matched.push(w);
    });
    var percent = Math.round((score / (words.length * MAX_PER_WORD)) * 100);
    // Typed the item's name, or most of it: that's a near-certain match.
    if (phrase && phrase.length > 3) {
      var short = entry.nameLower.split(' / ')[0];
      if (short === phrase || entry.nameLower === phrase) percent = 99;
      else if (short.indexOf(phrase) === 0) percent = Math.max(percent, 95);
      else if (entry.nameLower.indexOf(phrase) !== -1) percent = Math.max(percent, 92);
    }
    return { score: score, percent: Math.max(1, Math.min(99, percent)), matched: matched };
  }

  /** Ranked matches. opts: types (array), categories (array), limit, min (%). */
  function search(query, opts) {
    opts = opts || {};
    if (!index) index = buildIndex();
    var words = tokenize(query);
    if (!words.length) return [];
    var phrase = String(query).toLowerCase().trim();
    var out = [];
    index.forEach(function (e) {
      if (opts.types && opts.types.indexOf(e.type) === -1) return;
      if (opts.categories && opts.categories.indexOf(e.item.category) === -1) return;
      var s = scoreEntry(words, e, phrase);
      if (s.score <= 0) return;
      var pct = s.percent;
      if (opts.adjust) pct = opts.adjust(e, pct);
      if (pct >= (opts.min || 1)) out.push({ entry: e, percent: pct, score: s.score, matched: s.matched });
    });
    out.sort(function (a, b) { return b.percent - a.percent || b.score - a.score; });
    return out.slice(0, opts.limit || 6);
  }

  function bestRole(text, min) {
    var r = search(text, { types: ['role'], limit: 1, min: min || 40 });
    return r[0] || null;
  }

  function roleByName(name) {
    if (!index) index = buildIndex();
    for (var i = 0; i < index.length; i++) if (index[i].type === 'role' && index[i].name === name) return index[i];
    return null;
  }

  function toResult(r, why) {
    return { url: r.entry.url, label: r.entry.label, name: r.entry.name, snippet: clip(r.entry.snippet, 140), percent: r.percent, why: why || '' };
  }

  // ---- areas of work, for the "what are you drawn to?" question ----------

  var AREAS = [
    { label: 'AI & agents', cats: ['AI, Agents & Intelligent Automation', 'AI Evaluation, Reliability & Safety Engineering'] },
    { label: 'Software engineering', cats: ['Software & Application Engineering', 'Platform Engineering'] },
    { label: 'Data & machine learning', cats: ['Data, AI & Machine Learning'] },
    { label: 'Product management', cats: ['Product Operations & Product Leadership', 'AI Product, Strategy & Enterprise Transformation'] },
    { label: 'Cloud & infrastructure', cats: ['Cloud, Platform & Systems Engineering', 'Data Center, AI Compute & Infrastructure'] },
    { label: 'Sales & go-to-market', cats: ['Revenue Operations, Technical Sales & GTM Systems'] },
    { label: 'Business & operations', cats: ['Business Management', 'Actuarial, Insurance & Enterprise Risk'] },
    { label: 'Leading AI adoption', cats: ['AI Adoption, Transformation & Organizational Change', 'Leadership, Management & Personal Development'] },
    { label: 'Design & digital', cats: ['Design, Communication & Digital Experience', 'Creator Economy, Social Media & Digital Growth'] },
    { label: 'Privacy, risk & governance', cats: ['Data Governance, Privacy & Trust'] },
    { label: 'Healthcare', cats: ['Healthcare Operations, Digital Health & Interoperability', 'Environmental Health & Safety'] },
  ];

  function areaFor(text) {
    var t = String(text).toLowerCase().trim();
    for (var i = 0; i < AREAS.length; i++) if (AREAS[i].label.toLowerCase() === t) return AREAS[i];
    return null;
  }

  // Words in "what do you do today?" answers that say nothing about skills.
  var BACKGROUND_NOISE = { high: 1, school: 1, college: 1, university: 1, year: 1, years: 1, student: 1, between: 1, currently: 1, full: 1, time: 1, part: 1, worked: 1, working: 1, been: 1, as: 1 };

  var SENIOR = /\b(senior|sr|principal|director|head|chief|vp|staff|c-suite)\b/i;

  // ---- time estimates -----------------------------------------------------

  // A role path is 12 video lessons over three levels plus a capstone. Most
  // lessons run 30-90 minutes and the practice around them about as long
  // again, so a level is roughly 8 hours and the capstone about 12.
  var HOURS_PER_LEVEL = 8;
  var CAPSTONE_HOURS = 12;

  function planEstimate(level, hoursPerWeek) {
    var startAt = level === 'a lot' ? 'ADVANCED' : level === 'some' ? 'INTERMEDIATE' : 'BASIC';
    var levels = startAt === 'ADVANCED' ? 1 : startAt === 'INTERMEDIATE' ? 2 : 3;
    var total = levels * HOURS_PER_LEVEL + CAPSTONE_HOURS;
    var weeks = Math.max(1, Math.ceil(total / (hoursPerWeek || 5)));
    return { startAt: startAt, total: total, weeks: weeks };
  }

  function hoursFrom(text) {
    // "2-3 hours" counts as 3.
    var m = String(text).match(/(\d+)\s*(?:-|–|to)\s*(\d+)/) || String(text).match(/(\d+)/);
    if (m && m[2]) return Math.max(1, Math.min(40, parseInt(m[2], 10)));
    return m ? Math.max(1, Math.min(40, parseInt(m[1], 10))) : 5;
  }

  // ---- answers to common questions about the site ------------------------

  var FAQ = [
    { re: /\b(is (it|this|everything|the academy|zuyini) (really )?free|how much (is|does)|costs?|price|pricing|do i (have|need) to pay|paid|charges?|subscription)\b/i, text: "Everything in Zuyini Academy is free. Browsing is open to everyone, and a free sign-up (just a name and email, no card) unlocks every video and your progress tracker. There are no paywalled lessons." },
    { re: /\b(accredit\w*|are (the|your|these) certificates|certificates? (are |is )?(recogni[sz]ed|worth|legit|official|real)|recogni[sz]ed by|is (this|it) (legit|accredited|official)|on my (resume|cv|linkedin)|real credentials?)\b/i, text: "The Academy's certificates are self-paced completion tracking, not formal credentials: there's no accreditation body behind them, and each certificate page states exactly what \"complete\" means. For credentials issued by Google, Microsoft, AWS, Harvard and others, the free credentials guide explains what each one is worth on a resume.", links: [{ label: 'Free credentials guide', url: '/academy/real-credentials/' }] },
    { re: /\b(sign ?up|signup|register|log ?in|login|password|create an account|need an account|my account|give my email)\b/i, text: "Signing up is free and takes about 10 seconds: a name and an email, no password or card. It unlocks every video and your progress tracker, and you can unsubscribe from emails at any time." },
    { re: /\b(how long|how many (hours|weeks|months)|duration|time (does|will) it take|take to (finish|complete))\b/i, text: "Each role path has about 12 video lessons over three levels (Basic, Intermediate, Advanced), then a capstone project. Allow roughly 35 hours for the whole path: about 7 weeks at 5 hours a week. If you already have experience, you can start at Intermediate or Advanced. Tell me the role and your hours a week, and I'll work out a plan." },
    { re: /\b(job (alert|alerts|listing|listings|openings|radar|digest)|job openings|who'?s hiring|find (me )?(a )?job openings)\b/i, text: "Job Radar sends you a free ranked digest of real openings for a role, pulled from that role's benchmark employers plus RemoteOK and We Work Remotely, with direct LinkedIn and Indeed search links, and matched to the free courses for that role.", links: [{ label: 'Set up Job Radar', url: '/academy/#job-radar' }] },
    { re: /\b(zuyini app|the app|an app|mobile app|phone app|iphone app|android app|daily practice)\b/i, text: "The Zuyini app is the daily-practice side: a word of the day, executive communication, speaking practice, languages, an AI assistant and more, in a few minutes a day. It's free to start, on the web and on phones.", links: [{ label: 'Open the Zuyini app', url: 'https://app.zuyini.com' }] },
    { re: /\b(who (made|built|runs|created)|about (zuyini|you|this site)|who are you|behind this)\b/i, text: "Zuyini Academy's paths were built by Manny Ogbeide, a product leader at Microsoft (formerly Amazon and AWS) who has hired for the roles these paths prepare you for. I'm the site's assistant: I can help you pick a path and plan it." },
    { re: /\b(how does (this|it|the academy) work|where (do|should) i start|get started|how (do|to) (i )?start|what is (this|zuyini))\b/i, text: "Pick a job title, then work through its three levels of hand-picked free videos (Basic, Intermediate, Advanced) and finish with a capstone project you can show an employer. Not sure which role? I can ask you a few questions, or you can take the 60-second quiz.", links: [{ label: 'Take the 60-second quiz', url: '/academy/find-your-path/' }], chips: ['Help me choose a role'] },
  ];

  // ---- storage ------------------------------------------------------------

  var STORAGE_KEY = 'zuyini_chat_widget_v1';

  function defaultState() {
    return { open: false, minimized: false, maximized: false, messages: [], ctx: {} };
  }

  function loadState() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      var saved = raw ? JSON.parse(raw) : null;
      if (!saved || !Array.isArray(saved.messages)) return defaultState();
      var state = defaultState();
      state.open = !!saved.open;
      state.minimized = !!saved.minimized;
      state.maximized = !!saved.maximized;
      state.messages = saved.messages.filter(function (m) { return m && !m.typing; }).slice(-60);
      state.ctx = saved.ctx && typeof saved.ctx === 'object' ? saved.ctx : {};
      return state;
    } catch (e) {
      return defaultState();
    }
  }

  function saveState(state) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // storage unavailable (private mode etc.) -- chat still works, just doesn't persist
    }
  }

  // ---- UI -----------------------------------------------------------------

  var state = loadState();

  var root = document.createElement('div');
  root.id = 'zuyini-chat-root';
  root.innerHTML =
    '<button type="button" id="zuyini-chat-launcher" aria-label="Ask Zuyini Assistant" aria-expanded="false">' +
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>' +
    '<span id="zuyini-chat-launcher-label">Ask</span>' +
    '</button>' +
    '<div id="zuyini-chat-panel" hidden>' +
    '<div id="zuyini-chat-header">' +
    '<div><strong>Zuyini Assistant</strong><span id="zuyini-chat-subtitle">Ask a career question or plan your next move</span></div>' +
    '<div id="zuyini-chat-header-actions">' +
    '<button type="button" id="zuyini-chat-clear" aria-label="Start new chat"></button>' +
    '<button type="button" id="zuyini-chat-minimize" aria-label="Minimize chat"></button>' +
    '<button type="button" id="zuyini-chat-maximize" aria-label="Maximize chat"></button>' +
    '<button type="button" id="zuyini-chat-close" aria-label="Close chat">&times;</button>' +
    '</div>' +
    '</div>' +
    '<div id="zuyini-chat-messages" role="log" aria-live="polite"></div>' +
    '<form id="zuyini-chat-form">' +
    '<input type="text" id="zuyini-chat-input" autocomplete="off" placeholder="Ask anything, or describe your goal..." aria-label="Ask a question" />' +
    '<button type="submit" aria-label="Send">&rarr;</button>' +
    '</form>' +
    '</div>';
  document.body.appendChild(root);

  var launcher = document.getElementById('zuyini-chat-launcher');
  var panel = document.getElementById('zuyini-chat-panel');
  var closeBtn = document.getElementById('zuyini-chat-close');
  var clearBtn = document.getElementById('zuyini-chat-clear');
  var minimizeBtn = document.getElementById('zuyini-chat-minimize');
  var maximizeBtn = document.getElementById('zuyini-chat-maximize');
  var messagesEl = document.getElementById('zuyini-chat-messages');
  var form = document.getElementById('zuyini-chat-form');
  var input = document.getElementById('zuyini-chat-input');

  var ICONS = {
    clear: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
    minimize: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    restoreFromMinimize: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>',
    maximize: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
    restoreFromMaximize: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
  };
  clearBtn.innerHTML = ICONS.clear;

  function applyPanelChrome() {
    panel.classList.toggle('zuyini-chat-minimized', state.minimized);
    panel.classList.toggle('zuyini-chat-maximized', state.maximized);
    minimizeBtn.innerHTML = state.minimized ? ICONS.restoreFromMinimize : ICONS.minimize;
    minimizeBtn.setAttribute('aria-label', state.minimized ? 'Restore chat' : 'Minimize chat');
    maximizeBtn.innerHTML = state.maximized ? ICONS.restoreFromMaximize : ICONS.maximize;
    maximizeBtn.setAttribute('aria-label', state.maximized ? 'Restore chat size' : 'Maximize chat');
  }
  applyPanelChrome();

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderMessages() {
    messagesEl.innerHTML = state.messages.map(renderMessage).join('');
    // Show the start of the newest answer, so long answers read from the top.
    var last = messagesEl.lastElementChild;
    if (last && last.classList.contains('zuyini-chat-msg-bot') && last.offsetHeight > messagesEl.clientHeight * 0.8) {
      messagesEl.scrollTop = last.offsetTop - messagesEl.offsetTop - 8;
    } else {
      scrollToBottom();
    }
  }

  function paragraphs(text) {
    return String(text).split(/\n+/).map(function (p) { return '<p>' + escapeHtml(p) + '</p>'; }).join('');
  }

  function renderPlan(plan) {
    var html = '<div class="zuyini-chat-plan">' +
      '<a class="zuyini-chat-plan-title" href="' + escapeHtml(plan.url) + '">' + escapeHtml(plan.name) + ' &rarr;</a>';
    plan.levels.forEach(function (lvl) {
      html += '<div class="zuyini-chat-plan-level' + (lvl.start ? ' zuyini-chat-plan-start' : '') + '">' +
        '<span class="zuyini-chat-plan-level-name">' + escapeHtml(lvl.level) + (lvl.start ? ' · start here' : '') + '</span>' +
        (lvl.intro ? '<span class="zuyini-chat-plan-intro">' + escapeHtml(lvl.intro) + '</span>' : '') +
        '<ul>' + lvl.comps.map(function (c) {
          return '<li>' + escapeHtml(c.title) + (c.video ? ' <a href="' + escapeHtml(c.video.url) + '" target="_blank" rel="noopener noreferrer">▶ ' + escapeHtml(c.video.title) + '</a>' : '') + '</li>';
        }).join('') + '</ul></div>';
    });
    if (plan.capstone) html += '<div class="zuyini-chat-plan-level"><span class="zuyini-chat-plan-level-name">CAPSTONE</span><span class="zuyini-chat-plan-intro">' + escapeHtml(plan.capstone) + '</span></div>';
    return html + '</div>';
  }

  function renderMessage(msg) {
    if (msg.role === 'user') {
      return '<div class="zuyini-chat-msg zuyini-chat-msg-user">' + escapeHtml(msg.text) + '</div>';
    }
    if (msg.typing) {
      return '<div class="zuyini-chat-msg zuyini-chat-msg-bot zuyini-chat-typing" aria-label="The assistant is typing"><span></span><span></span><span></span></div>';
    }
    var html = '<div class="zuyini-chat-msg zuyini-chat-msg-bot">';
    if (msg.text) html += paragraphs(msg.text);
    if (msg.resultsLabel && msg.results && msg.results.length) html += '<p class="zuyini-chat-results-label">' + escapeHtml(msg.resultsLabel) + '</p>';
    if (msg.results && msg.results.length) {
      html += '<div class="zuyini-chat-results">' + msg.results.map(function (r) {
        return '<a class="zuyini-chat-result" href="' + escapeHtml(r.url) + '">' +
          '<span class="zuyini-chat-result-top"><span class="zuyini-chat-result-label">' + escapeHtml(r.label) + '</span>' +
          (r.percent ? '<span class="zuyini-chat-result-match">' + r.percent + '% match</span>' : '') + '</span>' +
          '<span class="zuyini-chat-result-name">' + escapeHtml(r.name) + '</span>' +
          (r.why ? '<span class="zuyini-chat-result-why">' + escapeHtml(r.why) + '</span>' : '') +
          (r.snippet ? '<span class="zuyini-chat-result-snippet">' + escapeHtml(r.snippet) + '</span>' : '') +
          '</a>';
      }).join('') + '</div>';
    }
    if (msg.plan) html += renderPlan(msg.plan);
    if (msg.after) html += paragraphs(msg.after);
    if (msg.links && msg.links.length) {
      html += '<div class="zuyini-chat-links">' + msg.links.map(function (l) {
        var ext = /^https?:/.test(l.url) && l.url.indexOf(location.host) === -1;
        return '<a href="' + escapeHtml(l.url) + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + escapeHtml(l.label) + ' &rarr;</a>';
      }).join('') + '</div>';
    }
    if (msg.external) {
      html += '<div class="zuyini-chat-external">' +
        '<span class="zuyini-chat-external-label">Not finding it? Search the web:</span>' +
        '<a href="' + escapeHtml(msg.external.google) + '" target="_blank" rel="noopener noreferrer">Google &rarr;</a>' +
        '<a href="' + escapeHtml(msg.external.youtube) + '" target="_blank" rel="noopener noreferrer">YouTube &rarr;</a>' +
        '</div>';
    }
    if (msg.chips && msg.chips.length) {
      html += '<div class="zuyini-chat-chips">' + msg.chips.map(function (c) {
        return '<button type="button" class="zuyini-chat-chip" data-chip="' + escapeHtml(c) + '">' + escapeHtml(c) + '</button>';
      }).join('') + '</div>';
    }
    html += '</div>';
    return html;
  }

  function addMessage(msg) {
    state.messages.push(msg);
    if (state.messages.length > 60) state.messages = state.messages.slice(-60);
    saveState(state);
    renderMessages();
  }

  function bot(msg) {
    msg.role = 'bot';
    addMessage(msg);
  }

  function externalLinksFor(query) {
    var q = encodeURIComponent(query);
    return {
      google: 'https://www.google.com/search?q=' + q,
      youtube: 'https://www.youtube.com/results?search_query=' + q,
    };
  }

  var GOAL_CHIPS = ['Change careers', 'Prepare for a new job', 'Grow in my current role', 'Prepare for an interview', 'Just searching'];

  function greet() {
    bot({
      text: "Hi! I'm the Zuyini Assistant. Ask me anything about careers, skills or learning, and I'll answer and point you to the right Academy pages. I can also plan a career change, get you ready for a new job or an interview, or help you grow in your current role. What's on your mind?",
      chips: GOAL_CHIPS,
    });
  }

  function clearChat() {
    state.messages = [];
    state.ctx = {};
    saveState(state);
    renderMessages();
    greet();
    if (!state.minimized) setTimeout(function () { input.focus(); }, 50);
  }

  // ---- conversation -------------------------------------------------------

  function ask(step, msg) {
    state.ctx.step = step;
    state.ctx.options = (msg.chips || []).map(function (c) { return c.toLowerCase(); });
    bot(msg);
  }

  function startFlow(flow, firstAnswer) {
    state.ctx = { flow: flow, lastRole: state.ctx.lastRole, lastResults: state.ctx.lastResults };
    if (flow === 'change') {
      if (firstAnswer) return answer('current', firstAnswer);
      ask('current', { text: "Great, let's find you the right path. First, what do you do today? A job title or field is perfect, or \"student\" or \"between jobs\"." });
    } else if (flow === 'newjob') {
      if (firstAnswer) return answer('title', firstAnswer);
      ask('title', { text: "Congratulations! What's the job title of the new role?" });
    } else if (flow === 'grow') {
      if (firstAnswer) return answer('title', firstAnswer);
      ask('title', { text: "Happy to help you grow. What's your current role?" });
    } else if (flow === 'interview') {
      if (firstAnswer) return answer('title', firstAnswer);
      ask('title', { text: "Let's get you ready. Which role are you interviewing for?" });
    }
  }

  function detectGoal(text) {
    var t = text.toLowerCase();
    if (/^change careers$|career (change|switch|pivot)|change (my )?(career|field|industry)|switch(ing)? (career|careers|field|fields|industr\w*|into|to)|transition(ing)? (in)?to|pivot(ing)? (in)?to|move into|moving into|break into|get into|new career/.test(t)) return 'change';
    if (/^prepare for an interview$|\binterview(s|ing)?\b/.test(t)) return 'interview';
    if (/^prepare for a new job$|new (job|role|position)|starting (a|my|the) (new )?(job|role)|start(ing)? (next|in|on)\b|just (got|landed|started|accepted)|accepted (an|the) offer|got (the|a|an) (job|offer)|got hired|onboarding/.test(t)) return 'newjob';
    if (/^grow in my current role$|current (role|job|position)|in my (role|job)|promotion|get promoted|upskill|level up|get better at|improve (my|at)|grow in|stay relevant|new skills? (for|in) my/.test(t)) return 'grow';
    return null;
  }

  // Strips the goal phrasing to leave the role or field, e.g. "I want to
  // switch into product management" -> "product management".
  function subjectOf(text) {
    var m = String(text).match(/(?:into|to become (?:a|an)?|become (?:a|an)?|as (?:a|an)|for (?:a|an|the)?|move to|switch to|transition to|pivot to)\s+(.+)$/i);
    var s = m ? m[1] : '';
    s = s.replace(/\b(role|job|position|career|please|soon|next (week|month))\b/gi, '').trim();
    return tokenize(s).length ? s : '';
  }

  function handleQuery(query) {
    query = String(query).trim();
    if (!query) return;
    addMessage({ role: 'user', text: query });
    var t = query.toLowerCase();
    var ctx = state.ctx;

    // Navigation chips.
    if (/^(start over|restart|reset)$/.test(t)) {
      state.ctx = {};
      return bot({ text: 'Sure, starting fresh. What would you like to do?', chips: GOAL_CHIPS });
    }
    if (t === 'just searching') {
      state.ctx = { lastRole: ctx.lastRole };
      return bot({ text: 'Type a job title, skill or topic (for example "SQL", "cloud security" or "product manager") and I\'ll find the closest matches.' });
    }
    if (t === 'help me choose a role') return startFlow('change');

    // Small talk.
    if (/^(hi|hello|hey|hiya|good (morning|afternoon|evening))\b[!. ]*$/.test(t)) {
      return bot({ text: 'Hello! What would you like to do today?', chips: GOAL_CHIPS });
    }
    if (/^(thanks|thank you|thx|ty|cheers|great|perfect|awesome|ok|okay)\b[!. ]*$/.test(t)) {
      return bot({ text: "You're welcome! Anything else I can help with?", chips: followUps() });
    }

    // Follow-ups about the last role.
    var follow = followUpAction(t);
    if (follow) return follow();

    // A pending question gets the answer, unless the message is clearly
    // something else (a new goal, a site question, a role question).
    var goal = detectGoal(t);
    var picked = ctx.step && ctx.options && ctx.options.indexOf(t) !== -1;
    if (ctx.step && (picked || (!goal && !faqFor(t) && !roleQuestion(t)))) return answer(ctx.step, query);

    if (goal) {
      var subject = subjectOf(query);
      if (goal === 'change' && subject) {
        // "Switch into product management": skip straight to the target.
        state.ctx = { flow: 'change', lastRole: ctx.lastRole };
        return answer('target', subject);
      }
      return startFlow(goal, subject || null);
    }

    var rq = roleQuestion(t);
    if (rq) return rq();

    var faq = faqFor(t);
    if (faq) {
      return bot({ text: faq.text, links: faq.links, chips: faq.chips || followUps() });
    }

    return plainSearch(query);
  }

  function faqFor(t) {
    for (var i = 0; i < FAQ.length; i++) if (FAQ[i].re.test(t)) return FAQ[i];
    return null;
  }

  // Questions about a specific role: skills needed, what you'll learn, how
  // long it takes, what the job is.
  function roleQuestion(t) {
    var kind = null;
    if (/\b(what|which) (skills?|competenc\w+)|skills? (do i need|needed|required|for)|requirements? for|what (do|does|will) (i|you) (need|learn)|what('?s| is) in the|syllabus|curriculum/.test(t)) kind = 'skills';
    else if (/\bhow long\b.*\b(to|for|become)\b/.test(t)) kind = 'time';
    else if (/\bwhat (does|do) (a|an)\b.+\b(do|does)\b|\bwhat is (a|an)\b.+\b(role|job|engineer|manager|analyst|lead|designer|scientist|developer|consultant)\b/.test(t)) kind = 'about';
    if (!kind) return null;
    var subject = t
      .replace(/\b(what|which|skills?|competenc\w+|do|does|did|i|you|need|needed|required|requirements?|for|to|become|be|a|an|the|how|long|take|it|is|in|will|learn|syllabus|curriculum|what's|role|job)\b/g, ' ')
      .replace(/[?.!]/g, ' ').trim();
    var r = subject ? bestRole(subject, 35) : null;
    if (!r && state.ctx.lastRole) r = { entry: roleByName(state.ctx.lastRole), percent: 0 };
    if (!r || !r.entry) return null;
    return function () {
      state.ctx.lastRole = r.entry.name;
      if (kind === 'skills') return showSkills(r.entry);
      if (kind === 'time') return showTime(r.entry, state.ctx.hours || 5, state.ctx.level);
      return showAbout(r.entry);
    };
  }

  function followUps() {
    var role = state.ctx.lastRole;
    if (!role) return ['Change careers', 'Prepare for a new job', 'Grow in my current role'];
    var s = shortName(role);
    var chips = ['Show the plan for ' + s, 'Skills for ' + s, 'Interview prep for ' + s];
    if (state.ctx.lastResults && state.ctx.lastResults.length > 1) chips.push('Compare the top 2');
    chips.push('Start over');
    return chips;
  }

  function followUpAction(t) {
    var m;
    if ((m = t.match(/^show the plan for (.+)$/)) || /^(show (me )?(the )?plan|what('?s| is) the plan|make (me )?a plan)$/.test(t)) {
      var name = m ? findRoleName(m[1]) : state.ctx.lastRole;
      if (name) return function () { state.ctx.lastRole = name; showPlan(roleByName(name)); };
    }
    if ((m = t.match(/^skills for (.+)$/))) {
      var n2 = findRoleName(m[1]);
      if (n2) return function () { state.ctx.lastRole = n2; showSkills(roleByName(n2)); };
    }
    if ((m = t.match(/^interview prep for (.+)$/))) {
      var n3 = findRoleName(m[1]) || m[1];
      return function () { showInterview(n3); };
    }
    if (/^compare( the)? top (2|two)$|^compare them$/.test(t) && state.ctx.lastResults && state.ctx.lastResults.length > 1) {
      return function () { showCompare(roleByName(state.ctx.lastResults[0]), roleByName(state.ctx.lastResults[1])); };
    }
    if (/^(more|show more|other options|something else|more options)$/.test(t) && state.ctx.lastQuery) {
      return function () { plainSearch(state.ctx.lastQuery, 6); };
    }
    return null;
  }

  function findRoleName(text) {
    var all = (state.ctx.lastResults || []).concat(state.ctx.lastRole ? [state.ctx.lastRole] : []);
    var lower = String(text).toLowerCase();
    for (var i = 0; i < all.length; i++) if (shortName(all[i]).toLowerCase() === lower || all[i].toLowerCase() === lower) return all[i];
    var r = bestRole(text, 35);
    return r ? r.entry.name : null;
  }

  function answer(step, text) {
    var ctx = state.ctx;
    ctx.step = null;
    // "How many hours a week?" after a time estimate.
    if (step === 'retime' && ctx.lastRole && /\d/.test(text)) {
      ctx.hours = hoursFrom(text);
      return showTime(roleByName(ctx.lastRole), ctx.hours, ctx.level);
    }
    if (ctx.flow === 'change') {
      if (step === 'current') {
        ctx.current = text;
        var cur = bestRole(text, 45);
        ctx.currentRole = cur ? cur.entry.name : null;
        return ask('target', {
          text: (cur ? 'Thanks. Your background as ' + shortName(cur.entry.name) + ' will carry over in places. ' : 'Thanks. ') + 'What kind of work are you drawn to? Pick an area, or type a job title if you have one in mind.',
          chips: AREAS.map(function (a) { return a.label; }).concat(['Not sure yet']),
        });
      }
      if (step === 'target') {
        ctx.target = text;
        var area = areaFor(text);
        if (area) ctx.area = area.label;
        else if (/not sure|no idea|don'?t know|unsure/i.test(text)) ctx.area = null;
        else {
          var tr = bestRole(text, 45);
          ctx.targetRole = tr ? tr.entry.name : null;
        }
        return ask('level', {
          text: 'How much experience do you already have in that area?',
          chips: ['None yet', 'Some', 'A lot'],
        });
      }
      if (step === 'level') {
        ctx.level = /a lot|lots|expert|years|senior|advanced/i.test(text) ? 'a lot' : /some|bit|little|intermediate|few/i.test(text) ? 'some' : 'none';
        return ask('hours', { text: 'And how many hours a week can you give it?', chips: ['2-3 hours', '5 hours', '10+ hours'] });
      }
      if (step === 'hours') {
        ctx.hours = hoursFrom(text);
        return recommendChange();
      }
    }
    if (ctx.flow === 'newjob') {
      if (step === 'title') {
        ctx.title = text;
        var nr = bestRole(text, 35);
        ctx.targetRole = nr ? nr.entry.name : null;
        return ask('stage', { text: 'Where are you in the process?', chips: ['Interviewing', 'Starting soon', 'Already started'] });
      }
      if (step === 'stage') {
        ctx.stage = /interview/i.test(text) ? 'interviewing' : /already|started|in the role/i.test(text) ? 'started' : 'soon';
        return recommendNewJob();
      }
    }
    if (ctx.flow === 'grow') {
      if (step === 'title') {
        ctx.title = text;
        var gr = bestRole(text, 35);
        ctx.currentRole = gr ? gr.entry.name : null;
        var chips = ['Move up to a lead role', 'Use AI in my role'];
        if (gr) {
          (gr.entry.item.levels || []).forEach(function (lvl) {
            (lvl.competencies || []).forEach(function (c) { if (chips.length < 7) chips.push(clip(c.title.split(/[,+]/)[0], 40)); });
          });
        }
        return ask('focus', {
          text: (gr ? 'Got it: ' + shortName(gr.entry.name) + '. ' : 'Got it. ') + 'What do you want to get better at? Pick one or describe it in your own words.',
          chips: chips,
        });
      }
      if (step === 'focus') {
        ctx.focus = text;
        return recommendGrow();
      }
    }
    if (ctx.flow === 'interview' && step === 'title') {
      ctx.title = text;
      return showInterview(text);
    }
    return plainSearch(text);
  }

  function reasonFor(r, words) {
    var m = r.matched.filter(function (w) { return words.indexOf(w) !== -1; }).slice(0, 4);
    if (r.area) return m.length ? 'In your chosen area · draws on: ' + m.join(', ') : 'In your chosen area';
    return m.length ? 'Matches: ' + m.join(', ') : '';
  }

  function recommendChange() {
    var ctx = state.ctx;
    var area = ctx.area ? AREAS.filter(function (a) { return a.label === ctx.area; })[0] : null;
    var results;
    var query;
    if (ctx.targetRole) {
      query = ctx.target;
      results = search(query, { types: ['role'], limit: 3, adjust: adjustForLevel });
    } else if (area) {
      // Within the chosen area, rank by what carries over from today's work.
      query = ctx.current || '';
      results = areaFit(area, ctx.current);
    } else {
      query = ctx.current || ctx.target || '';
      results = search(query, { types: ['role'], limit: 3, adjust: adjustForLevel });
    }
    if (!results.length) {
      return bot({
        text: "I couldn't find a close match for that yet. The 60-second quiz asks a few more questions and suggests a role, or you can tell me a job title you're curious about.",
        links: [{ label: 'Take the 60-second quiz', url: '/academy/find-your-path/' }],
        chips: AREAS.slice(0, 5).map(function (a) { return a.label; }),
      });
    }
    var words = tokenize(query);
    var top = results[0].entry;
    var est = planEstimate(ctx.level, ctx.hours);
    ctx.lastRole = top.name;
    ctx.lastResults = results.map(function (r) { return r.entry.name; });
    var intro = 'Here are the roles that fit best' + (area ? ' in ' + area.label : '') + ':';
    var after = 'My suggestion: ' + shortName(top.name) + '. Start at ' + est.startAt.charAt(0) + est.startAt.slice(1).toLowerCase() +
      ', and at ' + ctx.hours + ' hour' + (ctx.hours === 1 ? '' : 's') + ' a week the path takes about ' + est.weeks + ' week' + (est.weeks === 1 ? '' : 's') +
      ' (roughly ' + est.total + ' hours including the capstone).';
    if (ctx.currentRole && ctx.currentRole !== top.name && roleByName(ctx.currentRole) && roleByName(ctx.currentRole).item.category === top.item.category) {
      after += ' Your experience as ' + shortName(ctx.currentRole) + ' is in the same field, so parts of it will feel familiar.';
    }
    var pathway = search(top.item.category, { types: ['pathway'], limit: 1 })[0];
    bot({
      text: intro,
      results: results.map(function (r) { return toResult(r, reasonFor(r, words)); }),
      after: after,
      links: pathway ? [{ label: 'The ' + pathway.entry.name + ' pathway', url: pathway.entry.url }] : [],
      chips: followUps(),
    });
  }

  // New to the field: don't lead with senior roles.
  function adjustForLevel(e, pct) {
    if (!SENIOR.test(e.name)) return pct;
    if (state.ctx.level === 'none') return Math.round(pct * 0.55);
    if (state.ctx.level === 'some') return Math.round(pct * 0.85);
    return pct;
  }

  // Fit for a role inside the area the visitor picked: being in the area
  // counts for half, then how well it matches the area's focus and how much
  // of today's work carries over.
  function areaFit(area, background) {
    var areaWords = tokenize(area.label + ' ' + area.cats.join(' '));
    var bgWords = tokenize(background || '').filter(function (w) { return !BACKGROUND_NOISE[w]; });
    if (!index) index = buildIndex();
    var out = [];
    index.forEach(function (e) {
      if (e.type !== 'role' || area.cats.indexOf(e.item.category) === -1) return;
      var a = scoreEntry(areaWords, e);
      var b = bgWords.length ? scoreEntry(bgWords, e) : { percent: 0, matched: [], score: 0 };
      var pct = Math.min(97, Math.round(50 + 0.3 * a.percent + 0.4 * b.percent));
      out.push({ entry: e, percent: adjustForLevel(e, pct), score: a.score + b.score, matched: b.matched, area: true });
    });
    out.sort(function (x, y) { return y.percent - x.percent || y.score - x.score; });
    return out.slice(0, 3);
  }

  function recommendNewJob() {
    var ctx = state.ctx;
    var role = ctx.targetRole ? roleByName(ctx.targetRole) : null;
    if (!role) {
      var r = search(ctx.title, { limit: 4 });
      return bot({
        text: "I don't have a path called \"" + ctx.title + '" yet. These are the closest matches:',
        results: r.map(function (x) { return toResult(x); }),
        external: externalLinksFor(ctx.title + ' skills'),
        chips: ['Prepare for an interview', 'Start over'],
      });
    }
    ctx.lastRole = role.name;
    ctx.lastResults = [role.name];
    if (ctx.stage === 'interviewing') return showInterview(role.name, true);
    var text = ctx.stage === 'started'
      ? "Since you've started, focus on what matters in your first months as " + shortName(role.name) + '. The Basic level covers it:'
      : 'Before you start, the Basic level of the ' + shortName(role.name) + ' path covers what matters most in your first months:';
    showPlan(role, { text: text, only: ctx.stage === 'started' ? ['BASIC', 'INTERMEDIATE'] : ['BASIC'], startAt: 'BASIC' });
  }

  function recommendGrow() {
    var ctx = state.ctx;
    var role = ctx.currentRole ? roleByName(ctx.currentRole) : null;
    var focus = ctx.focus;
    if (/move up|lead|senior|promot|manager|management/i.test(focus)) {
      var up = search((role ? role.item.category + ' ' : '') + (ctx.title || '') + ' lead manager director', { types: ['role'], limit: 3 });
      up = up.filter(function (r) { return !role || r.entry.name !== role.name; });
      if (up.length) {
        ctx.lastRole = up[0].entry.name;
        ctx.lastResults = up.map(function (r) { return r.entry.name; });
        return bot({
          text: 'To move up, these next-step roles build on what you do today:',
          results: up.map(function (r) { return toResult(r); }),
          after: role ? 'In your current path, the Advanced level of ' + shortName(role.name) + ' is the bridge: ' + clip((role.item.levels[2] || {}).intro, 120) + '.' : '',
          chips: followUps(),
        });
      }
    }
    if (/\bai\b|artificial intelligence|automat/i.test(focus)) focus = (role ? role.name + ' ' : '') + 'ai agents automation';
    // The matching competency inside their own role first.
    if (role) {
      var words = tokenize(focus);
      var best = null;
      (role.item.levels || []).forEach(function (lvl) {
        (lvl.competencies || []).forEach(function (c) {
          var blob = (c.title + ' ' + (c.coverage || '')).toLowerCase();
          var hits = words.filter(function (w) { return blob.indexOf(w) !== -1; }).length;
          if (hits && (!best || hits > best.hits)) best = { hits: hits, c: c, lvl: lvl };
        });
      });
      if (best) {
        ctx.lastRole = role.name;
        var vids = best.c.videos || [];
        var more = search(focus, { types: ['skill', 'course', 'certificate'], limit: 2, min: 30 });
        return bot({
          text: 'In the ' + shortName(role.name) + ' path, that\'s "' + best.c.title + '" (' + best.lvl.level.charAt(0) + best.lvl.level.slice(1).toLowerCase() + ' level). Start with these:',
          links: vids.map(function (v) { return { label: '▶ ' + v.title + (v.channel ? ' (' + v.channel + ')' : ''), url: v.url }; }),
          results: more.map(function (r) { return toResult(r); }),
          after: more.length ? 'And to go deeper, the matches above.' : '',
          chips: followUps(),
        });
      }
    }
    var found = search(focus, { limit: 4 });
    if (found.length) {
      var r0 = found.filter(function (r) { return r.entry.type === 'role'; })[0];
      if (r0) { ctx.lastRole = r0.entry.name; ctx.lastResults = [r0.entry.name]; }
      return bot({ text: 'These will help you get better at ' + focus + ':', results: found.map(function (r) { return toResult(r); }), chips: followUps() });
    }
    return plainSearch(focus);
  }

  function showPlan(role, opts) {
    if (!role) return plainSearch(state.ctx.lastRole || '');
    opts = opts || {};
    var est = planEstimate(state.ctx.level, state.ctx.hours || 5);
    var startAt = opts.startAt || est.startAt;
    var levels = (role.item.levels || []).filter(function (l) { return !opts.only || opts.only.indexOf(l.level) !== -1; });
    var plan = {
      name: role.name,
      url: role.url,
      levels: levels.map(function (l) {
        return {
          level: l.level,
          intro: l.intro,
          start: l.level === startAt,
          comps: (l.competencies || []).map(function (c) { return { title: c.title, video: (c.videos || [])[0] || null }; }),
        };
      }),
      capstone: opts.only ? '' : clip(role.item.capstone, 220),
    };
    bot({
      text: opts.text || 'Here\'s the ' + shortName(role.name) + ' plan: ' + levels.length + ' levels with two competencies each, then a capstone. Each competency has hand-picked free videos; the first one is linked here.',
      plan: plan,
      after: opts.only ? '' : 'At ' + (state.ctx.hours || 5) + ' hours a week, expect about ' + est.weeks + ' weeks from the ' + startAt.toLowerCase() + ' level.',
      links: [{ label: 'Open the full path', url: role.url }],
      chips: followUps(),
    });
  }

  function showSkills(role) {
    var lines = (role.item.levels || []).map(function (l) {
      return l.level.charAt(0) + l.level.slice(1).toLowerCase() + ': ' + (l.competencies || []).map(function (c) { return c.title; }).join('; ') + '.';
    });
    bot({
      text: 'To work as ' + shortName(role.name) + ', the path builds these skills:\n' + lines.join('\n'),
      after: role.item.capstone ? 'Employers look for evidence, so the capstone asks you to ' + clip(role.item.capstone.charAt(0).toLowerCase() + role.item.capstone.slice(1), 200) : '',
      links: [{ label: 'Open the ' + shortName(role.name) + ' path', url: role.url }],
      chips: followUps(),
    });
  }

  function showTime(role, hours, level) {
    var est = planEstimate(level, hours);
    bot({
      text: 'The ' + shortName(role.name) + ' path is about ' + est.total + ' hours from the ' + est.startAt.toLowerCase() + ' level, including the capstone. At ' + hours + ' hours a week that\'s about ' + est.weeks + ' weeks. Already experienced? Starting at Intermediate saves about ' + HOURS_PER_LEVEL + ' hours.',
      links: [{ label: 'Open the path', url: role.url }],
      chips: ['2-3 hours a week', '10+ hours a week'].concat(followUps().slice(0, 2)),
    });
    state.ctx.flow = 'time';
    state.ctx.step = 'retime';
  }

  function showAbout(role) {
    var b = String(role.item.benchmark || '');
    var refresh = b.split(/Market refresh:\s*/i)[1] || b;
    bot({
      text: shortName(role.name) + ' (' + role.item.category + '). The work centres on ' + clip(refresh, 320),
      links: [{ label: 'Open the ' + shortName(role.name) + ' path', url: role.url }],
      chips: followUps(),
    });
  }

  function showInterview(text, fromNewJob) {
    var prep = search(text, { types: ['interview'], limit: 2, min: 30 });
    var role = bestRole(text, 35);
    if (role) { state.ctx.lastRole = role.entry.name; state.ctx.lastResults = [role.entry.name]; }
    var results = prep.map(function (r) { return toResult(r); });
    if (role) results.push(toResult(role, 'The skills interviewers will probe'));
    if (!results.length) {
      return bot({
        text: "I don't have interview prep for that exact role yet. These general guides cover most interviews:",
        results: search('behavioral interview leadership', { types: ['interview'], limit: 2 }).map(function (r) { return toResult(r); }),
        external: externalLinksFor(text + ' interview questions'),
        chips: ['Start over'],
      });
    }
    bot({
      text: (fromNewJob ? 'Good luck with the interviews! ' : '') + 'Here\'s what will help most:',
      results: results,
      after: 'Tip: practice telling one story per competency in the role path, with a measurable result.',
      chips: followUps(),
    });
  }

  function showCompare(a, b) {
    if (!a || !b) return bot({ text: 'Tell me the two roles you want to compare.', chips: ['Start over'] });
    function line(r) {
      var lv = r.item.levels || [];
      return shortName(r.name) + ' (' + r.item.category + '): ' + lv.map(function (l) { return l.level.charAt(0) + l.level.slice(1).toLowerCase() + ': ' + clip(l.intro, 70); }).join(' · ');
    }
    var wa = tokenize(competencyText(a.item.levels));
    var wb = tokenize(competencyText(b.item.levels));
    var shared = wa.filter(function (w) { return w.length > 3 && wb.indexOf(w) !== -1; }).slice(0, 6);
    bot({
      text: line(a) + '\n' + line(b) + (shared.length ? '\nIn common: ' + shared.join(', ') + '. Starting one makes the other easier later.' : ''),
      links: [{ label: shortName(a.name), url: a.url }, { label: shortName(b.name), url: b.url }],
      chips: ['Show the plan for ' + shortName(a.name), 'Show the plan for ' + shortName(b.name), 'Start over'],
    });
  }

  // Open questions get a direct answer first (from the Zuyini API, using the
  // closest Academy pages as context), then those pages. If the API can't
  // answer (offline, busy, or today's limit), it falls back to the results.
  var ASK_URL = (window.ZUYINI_API_BASE || 'https://zuyini-api.onrender.com/api') + '/academy/ask';

  function chatHistory() {
    // The last few turns, without the question being asked now.
    var past = state.messages.filter(function (m) { return m.text && !m.typing; });
    return past.slice(-9, -1).map(function (m) {
      var content = m.text + (m.results && m.results.length ? ' [Pages shown: ' + m.results.map(function (r) { return r.name; }).join('; ') + ']' : '');
      return { role: m.role === 'user' ? 'user' : 'assistant', content: content };
    });
  }

  function askAI(query, matches) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000);
    return fetch(ASK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl ? ctrl.signal : undefined,
      body: JSON.stringify({
        question: query,
        history: chatHistory(),
        matches: matches.slice(0, 8).map(function (m) { return { name: m.entry.name, type: m.entry.label, snippet: clip(m.entry.snippet, 220) }; }),
        page: document.title,
      }),
    }).then(function (res) {
      clearTimeout(timer);
      return res.json().then(function (body) { return res.ok ? body : null; });
    }).catch(function () { clearTimeout(timer); return null; });
  }

  function plainSearch(query, limit) {
    var matches = search(query, { limit: Math.max(limit || 5, 8), min: 8 });
    state.ctx.lastQuery = query;
    var words = tokenize(query);
    // "Show more" just lists more results.
    if (limit || !String(query).trim()) return showResults(query, matches.slice(0, limit || 5), words);

    var typing = { typing: true };
    bot(typing);
    askAI(query, matches).then(function (reply) {
      var i = state.messages.indexOf(typing);
      if (i !== -1) state.messages.splice(i, 1);
      if (!reply || !reply.answer) return showResults(query, matches.slice(0, 5), words);
      if (reply.crisis) return bot({ text: reply.answer });
      var picked = (reply.picks || []).map(function (name) {
        return matches.filter(function (m) { return m.entry.name === name; })[0];
      }).filter(Boolean);
      var pickedRoles = picked.filter(function (m) { return m.entry.type === 'role'; });
      if (pickedRoles.length) {
        state.ctx.lastRole = pickedRoles[0].entry.name;
        state.ctx.lastResults = pickedRoles.map(function (m) { return m.entry.name; });
      }
      bot({
        text: reply.answer,
        resultsLabel: picked.length ? 'Related on the Academy:' : '',
        results: picked.map(function (m) { var r = toResult(m, ''); r.percent = 0; return r; }),
        after: reply.followUp || '',
        external: picked.length ? null : externalLinksFor(query),
        chips: pickedRoles.length ? followUps() : ['Help me choose a role', 'Change careers', 'Prepare for an interview'],
      });
    });
  }

  function showResults(query, matches, words) {
    var roles = matches.filter(function (m) { return m.entry.type === 'role'; });
    if (roles.length) {
      state.ctx.lastRole = roles[0].entry.name;
      state.ctx.lastResults = roles.map(function (m) { return m.entry.name; });
    }
    if (!matches.length) {
      return bot({
        text: "I couldn't find a close match on the site for that. Here's a web search instead, or tell me what you're trying to achieve and I'll help you plan it.",
        external: externalLinksFor(query),
        chips: ['Change careers', 'Grow in my current role', 'Prepare for a new job'],
      });
    }
    var topRole = matches.filter(function (m) { return m.entry.type === 'role'; })[0];
    bot({
      text: 'Here\'s what I found for "' + query + '":',
      results: matches.map(function (m) { return toResult(m, reasonFor(m, words)); }),
      after: topRole ? 'Want a plan for ' + shortName(topRole.entry.name) + ', or help deciding?' : '',
      external: externalLinksFor(query),
      chips: topRole ? followUps() : ['Help me choose a role'],
    });
  }

  // ---- panel --------------------------------------------------------------

  function openPanel() {
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    state.open = true;
    applyPanelChrome();
    saveState(state);
    if (!state.messages.length) greet();
    else renderMessages();
    if (!state.minimized) setTimeout(function () { input.focus(); }, 50);
  }

  function closePanel() {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    state.open = false;
    saveState(state);
  }

  function toggleMinimize() {
    state.minimized = !state.minimized;
    applyPanelChrome();
    saveState(state);
    if (!state.minimized) setTimeout(function () { input.focus(); }, 50);
  }

  function toggleMaximize() {
    if (state.minimized) state.minimized = false;
    state.maximized = !state.maximized;
    applyPanelChrome();
    saveState(state);
  }

  launcher.addEventListener('click', function () {
    if (panel.hidden) openPanel(); else closePanel();
  });
  closeBtn.addEventListener('click', closePanel);
  clearBtn.addEventListener('click', clearChat);
  minimizeBtn.addEventListener('click', toggleMinimize);
  maximizeBtn.addEventListener('click', toggleMaximize);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) closePanel();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value;
    input.value = '';
    handleQuery(q);
  });

  messagesEl.addEventListener('click', function (e) {
    var chip = e.target.closest('.zuyini-chat-chip');
    if (chip) handleQuery(chip.getAttribute('data-chip'));
  });

  // Restore the conversation when moving between pages in the same tab. On
  // phones the panel would cover the page, so it always starts closed there.
  var small = window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
  if (state.open && !small) openPanel();
  else if (state.open) { state.open = false; saveState(state); }

  // ---- the "here's what I can do" alert -----------------------------------
  // Once per visit (browser session), a small bubble above the Ask button
  // says what the assistant does, with quick starts. It waits for the
  // sign-up box to close, never opens the chat by itself, and fades after
  // 15 seconds. On a role page it offers help with that role.

  var TEASER_KEY = 'zuyini_chat_teaser_v1';
  var teaser = null;

  function pageRole() {
    var m = location.pathname.match(/^\/academy\/roles\/([^/]+)/);
    if (!m) return null;
    if (!index) index = buildIndex();
    for (var i = 0; i < index.length; i++) if (index[i].type === 'role' && slugify(index[i].name) === m[1]) return index[i];
    return null;
  }

  function hideTeaser() {
    if (!teaser) return;
    teaser.classList.remove('zuyini-chat-teaser-show');
    launcher.classList.remove('zuyini-chat-pulse');
    var t = teaser;
    teaser = null;
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
  }

  function showTeaser() {
    if (!panel.hidden || teaser) return;
    try { sessionStorage.setItem(TEASER_KEY, '1'); } catch (e) {}
    var role = pageRole();
    var text = role
      ? 'Questions about ' + shortName(role.name) + '? I can list the skills, make you a time plan or find interview prep.'
      : 'Hi! I\'m the Zuyini Assistant. I can help you plan a career change, get ready for a new job, grow in your role, or answer any question about the Academy.';
    var chips = role
      ? ['Skills for ' + shortName(role.name), 'Show the plan for ' + shortName(role.name), 'Interview prep for ' + shortName(role.name)]
      : ['Change careers', 'Grow in my current role', 'Ask a question'];
    teaser = document.createElement('div');
    teaser.id = 'zuyini-chat-teaser';
    teaser.setAttribute('role', 'status');
    teaser.innerHTML =
      '<button type="button" class="zuyini-chat-teaser-close" aria-label="Dismiss">&times;</button>' +
      '<p class="zuyini-chat-teaser-text">' + escapeHtml(text) + '</p>' +
      '<div class="zuyini-chat-teaser-chips">' + chips.map(function (c) {
        return '<button type="button" class="zuyini-chat-teaser-chip" data-chip="' + escapeHtml(c) + '">' + escapeHtml(c) + '</button>';
      }).join('') + '</div>';
    root.insertBefore(teaser, launcher);
    teaser.addEventListener('click', function (e) {
      if (e.target.closest('.zuyini-chat-teaser-close')) return hideTeaser();
      var chip = e.target.closest('.zuyini-chat-teaser-chip');
      var q = chip ? chip.getAttribute('data-chip') : null;
      hideTeaser();
      openPanel();
      if (role) state.ctx.lastRole = role.name;
      if (q && q !== 'Ask a question') handleQuery(q);
    });
    // Next frame, so the fade-in runs.
    requestAnimationFrame(function () {
      if (!teaser) return;
      teaser.classList.add('zuyini-chat-teaser-show');
      launcher.classList.add('zuyini-chat-pulse');
    });
    setTimeout(hideTeaser, 15000);
  }

  function maybeTeaser() {
    try { if (sessionStorage.getItem(TEASER_KEY)) return; } catch (e) { return; }
    var waited = 0;
    var clearFor = 0;
    var timer = setInterval(function () {
      waited += 500;
      // Wait until the sign-up box has been gone for 1.5 seconds.
      clearFor = document.getElementById('signup-gate') ? 0 : clearFor + 500;
      if (!panel.hidden || waited > 180000) return clearInterval(timer);
      if (waited >= 3000 && clearFor >= 1500) {
        clearInterval(timer);
        showTeaser();
      }
    }, 500);
  }

  launcher.addEventListener('click', hideTeaser);
  maybeTeaser();

  // For tests: the conversation engine without the UI.
  window.__zuyiniAssistant = { search: search, handle: handleQuery, state: function () { return state; }, showTeaser: showTeaser };
})();
