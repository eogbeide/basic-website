(function () {
  // Zero-cost "ask a question" assistant: no API calls, no LLM -- it
  // scores the visitor's question against the same catalogs academy.js
  // already has loaded on every page (ROLES_DATA, PATHWAYS_DATA,
  // CERTIFICATES_DATA, SKILL_TRACKS_DATA, COURSES_DATA,
  // INTERVIEW_PREP_DATA) and returns the best-matching pages as real
  // links, plus pre-built external search links for anything it can't
  // find on-site. Conversation + open/closed state persist in
  // sessionStorage so they survive navigating between the site's static
  // pages (this isn't a single-page app outside academy/index.html).

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

  // Each catalog: which global var holds it, which fields to search (name
  // first = highest weight), which field to show as a snippet, how to
  // build its slug/URL, and the label shown on its result card.
  var CATALOGS = [
    { data: 'ROLES_DATA', fields: ['name', 'category', 'benchmark', 'capstone'], snippet: 'benchmark', urlBase: '/academy/roles/', slug: slugify, label: 'Role' },
    { data: 'PATHWAYS_DATA', fields: ['name', 'description', 'market_basis'], snippet: 'description', urlBase: '/academy/pathways/', slug: slugify, label: 'Career Pathway' },
    { data: 'CERTIFICATES_DATA', fields: ['name', 'description', 'category', 'university_benchmark'], snippet: 'description', urlBase: '/academy/certificates/', slug: slugify, label: 'Academic Certificate' },
    { data: 'SKILL_TRACKS_DATA', fields: ['name', 'category', 'intro', 'benchmark', 'tagline'], snippet: 'intro', urlBase: '/academy/skills/', slug: slugify, label: 'Skill Track / Certificate' },
    { data: 'COURSES_DATA', fields: ['name', 'description'], snippet: 'description', urlBase: '/academy/courses/', slug: courseSlug, label: 'Course' },
    { data: 'INTERVIEW_PREP_DATA', fields: ['name', 'subtitle', 'benchmark'], snippet: 'subtitle', urlBase: '/academy/interview/', slug: slugify, label: 'Interview Prep' },
  ];

  var STOPWORDS = { 'a': 1, 'an': 1, 'and': 1, 'are': 1, 'for': 1, 'how': 1, 'i': 1, 'in': 1, 'is': 1, 'me': 1, 'of': 1, 'on': 1, 'or': 1, 'the': 1, 'to': 1, 'what': 1, 'with': 1, 'you': 1, 'about': 1, 'find': 1, 'show': 1, 'want': 1, 'need': 1,
    // generic catalog-noise words -- nearly every item's own name ends
    // in "Certificate"/"Bootcamp"/"Course" etc, so scoring these would
    // bury the term that actually distinguishes what the visitor asked
    // for (e.g. "cybersecurity" in "cybersecurity certificate").
    'certificate': 1, 'certificates': 1, 'certification': 1, 'certifications': 1,
    'course': 1, 'courses': 1, 'bootcamp': 1, 'bootcamps': 1, 'track': 1, 'tracks': 1,
    'program': 1, 'programs': 1, 'mastery': 1, 'class': 1, 'classes': 1, 'training': 1,
    'learn': 1, 'learning': 1, 'role': 1, 'roles': 1, 'pathway': 1, 'pathways': 1 };

  function tokenize(text) {
    return String(text)
      .toLowerCase()
      .split(/[^a-z0-9+]+/)
      .filter(function (t) { return t.length > 1 && !STOPWORDS[t]; });
  }

  function scoreItem(item, fields, queryLower, queryTokens) {
    var score = 0;
    var nameText = String(item[fields[0]] || '').toLowerCase();
    if (nameText === queryLower) score += 60;
    if (queryLower.length > 2 && nameText.indexOf(queryLower) !== -1) score += 25;
    fields.forEach(function (f, i) {
      var text = String(item[f] || '').toLowerCase();
      if (!text) return;
      var weight = i === 0 ? 8 : 3;
      queryTokens.forEach(function (tok) {
        if (text.indexOf(tok) !== -1) score += weight;
      });
    });
    return score;
  }

  function search(query) {
    var queryLower = query.toLowerCase().trim();
    var queryTokens = tokenize(query);
    if (!queryTokens.length) return [];
    var results = [];
    CATALOGS.forEach(function (cat) {
      var arr = window[cat.data];
      if (!Array.isArray(arr)) return;
      arr.forEach(function (item) {
        var score = scoreItem(item, cat.fields, queryLower, queryTokens);
        if (score > 0) {
          results.push({ item: item, cat: cat, score: score });
        }
      });
    });
    results.sort(function (a, b) { return b.score - a.score; });
    return results.slice(0, 6);
  }

  function snippetFor(result) {
    var raw = result.item[result.cat.snippet] || '';
    raw = String(raw).replace(/\s+/g, ' ').trim();
    return raw.length > 140 ? raw.slice(0, 137) + '...' : raw;
  }

  function resultUrl(result) {
    return result.cat.urlBase + result.cat.slug(result.item.name) + '/';
  }

  // ---- storage ----
  var STORAGE_KEY = 'zuyini_chat_widget_v1';

  function defaultState() {
    return { open: false, minimized: false, maximized: false, messages: [] };
  }

  function loadState() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      var saved = raw ? JSON.parse(raw) : null;
      if (!saved || !Array.isArray(saved.messages)) {
        return defaultState();
      }
      var state = defaultState();
      state.open = !!saved.open;
      state.minimized = !!saved.minimized;
      state.maximized = !!saved.maximized;
      state.messages = saved.messages;
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

  // ---- UI ----
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
    '<div><strong>Zuyini Assistant</strong><span id="zuyini-chat-subtitle">Find roles, pathways, certificates &amp; courses</span></div>' +
    '<div id="zuyini-chat-header-actions">' +
    '<button type="button" id="zuyini-chat-minimize" aria-label="Minimize chat"></button>' +
    '<button type="button" id="zuyini-chat-maximize" aria-label="Maximize chat"></button>' +
    '<button type="button" id="zuyini-chat-close" aria-label="Close chat">&times;</button>' +
    '</div>' +
    '</div>' +
    '<div id="zuyini-chat-messages" role="log" aria-live="polite"></div>' +
    '<form id="zuyini-chat-form">' +
    '<input type="text" id="zuyini-chat-input" autocomplete="off" placeholder="Ask about a role, certificate, course..." aria-label="Ask a question" />' +
    '<button type="submit" aria-label="Send">&rarr;</button>' +
    '</form>' +
    '</div>';
  document.body.appendChild(root);

  var launcher = document.getElementById('zuyini-chat-launcher');
  var panel = document.getElementById('zuyini-chat-panel');
  var closeBtn = document.getElementById('zuyini-chat-close');
  var minimizeBtn = document.getElementById('zuyini-chat-minimize');
  var maximizeBtn = document.getElementById('zuyini-chat-maximize');
  var messagesEl = document.getElementById('zuyini-chat-messages');
  var form = document.getElementById('zuyini-chat-form');
  var input = document.getElementById('zuyini-chat-input');

  var ICONS = {
    minimize: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    restoreFromMinimize: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>',
    maximize: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
    restoreFromMaximize: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
  };

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
    scrollToBottom();
  }

  function renderMessage(msg) {
    if (msg.role === 'user') {
      return '<div class="zuyini-chat-msg zuyini-chat-msg-user">' + escapeHtml(msg.text) + '</div>';
    }
    var html = '<div class="zuyini-chat-msg zuyini-chat-msg-bot">';
    if (msg.text) html += '<p>' + escapeHtml(msg.text) + '</p>';
    if (msg.results && msg.results.length) {
      html += '<div class="zuyini-chat-results">' + msg.results.map(function (r) {
        return '<a class="zuyini-chat-result" href="' + escapeHtml(r.url) + '">' +
          '<span class="zuyini-chat-result-label">' + escapeHtml(r.label) + '</span>' +
          '<span class="zuyini-chat-result-name">' + escapeHtml(r.name) + '</span>' +
          (r.snippet ? '<span class="zuyini-chat-result-snippet">' + escapeHtml(r.snippet) + '</span>' : '') +
          '</a>';
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
    saveState(state);
    renderMessages();
  }

  function externalLinksFor(query) {
    var q = encodeURIComponent(query);
    return {
      google: 'https://www.google.com/search?q=' + q,
      youtube: 'https://www.youtube.com/results?search_query=' + q,
    };
  }

  function greet() {
    addMessage({
      role: 'bot',
      text: "Hi! I can search Zuyini Academy's roles, career pathways, certificates, skill tracks, courses and interview prep for you -- just ask.",
      chips: ['AI certificates', 'Product Manager roles', 'Data pathways', 'Interview prep for Software Engineer'],
    });
  }

  function handleQuery(query) {
    query = query.trim();
    if (!query) return;
    addMessage({ role: 'user', text: query });

    var matches = search(query);
    if (!matches.length) {
      addMessage({
        role: 'bot',
        text: "I couldn't find a close match on the site for that -- here's an external search instead:",
        external: externalLinksFor(query),
      });
      return;
    }

    var results = matches.map(function (m) {
      return { url: resultUrl(m), label: m.cat.label, name: m.item.name, snippet: snippetFor(m) };
    });
    addMessage({
      role: 'bot',
      text: 'Here’s what I found for “' + query + '”:',
      results: results,
      external: externalLinksFor(query),
    });
  }

  function openPanel() {
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    state.open = true;
    applyPanelChrome();
    saveState(state);
    if (!state.messages.length) greet();
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

  // restore prior conversation/open state (same tab, different page)
  if (state.messages.length) renderMessages();
  if (state.open) openPanel();
})();
