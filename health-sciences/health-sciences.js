(function () {
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isUrl(text) {
    return /^https?:\/\//i.test(text || '');
  }

  function renderCell(text) {
    var t = (text || '').trim();
    if (!t) return '';
    if (isUrl(t)) {
      return '<a href="' + escapeHtml(t) + '" target="_blank" rel="noopener noreferrer">Open &rarr;</a>';
    }
    return escapeHtml(t);
  }

  function renderSection(s) {
    var heading = s.heading ? '<h3>' + escapeHtml(s.heading) + '</h3>' : '';
    var body = '';
    if (s.type === 'paragraph') {
      body = '<p class="hsa-paragraph">' + escapeHtml(s.text) + '</p>';
    } else if (s.type === 'bullets') {
      body = '<ul class="hsa-bullets">' + s.items.map(function (it) {
        return '<li>' + escapeHtml(it) + '</li>';
      }).join('') + '</ul>';
    } else if (s.type === 'table') {
      var thead = '<tr>' + s.columns.map(function (c) {
        return '<th>' + escapeHtml(c) + '</th>';
      }).join('') + '</tr>';
      var rows = s.rows.map(function (row) {
        return '<tr>' + row.map(function (cell) {
          return '<td>' + renderCell(cell) + '</td>';
        }).join('') + '</tr>';
      }).join('');
      body = '<div class="hsa-table-wrap"><table class="hsa-table"><thead>' + thead + '</thead><tbody>' + rows + '</tbody></table></div>';
    }
    return '<div class="hsa-section">' + heading + body + '</div>';
  }

  function renderShareBar(url, title) {
    var eu = encodeURIComponent(url);
    var et = encodeURIComponent(title);
    return (
      '<div class="share-bar">' +
      '<span class="share-label">Share</span>' +
      '<a class="share-btn" href="https://twitter.com/intent/tweet?url=' + eu + '&text=' + et + '" target="_blank" rel="noopener noreferrer" aria-label="Share on X">X</a>' +
      '<a class="share-btn" href="https://www.linkedin.com/sharing/share-offsite/?url=' + eu + '" target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">in</a>' +
      '<a class="share-btn" href="https://www.facebook.com/sharer/sharer.php?u=' + eu + '" target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook">f</a>' +
      '<button type="button" class="share-btn share-copy" data-copy-url="' + escapeHtml(url) + '" aria-label="Copy link">Copy Link</button>' +
      '</div>'
    );
  }

  function renderTopic(topic) {
    return (
      '<div class="detail-card">' +
      '<h2>' + escapeHtml(topic.name) + '</h2>' +
      renderShareBar('https://zuyini.com/health-sciences/topics/' + topic.page + '/', topic.name + ' | Zuyini Health Sciences Academy') +
      (topic.phase ? '<p class="topic-phase">' + escapeHtml(topic.phase) + '</p>' : '') +
      topic.sections.map(renderSection).join('') +
      '</div>'
    );
  }

  var TOPICS = (typeof HSA_TOPICS_DATA !== 'undefined' ? HSA_TOPICS_DATA : []);

  var CATEGORIES = [];
  TOPICS.forEach(function (t) {
    if (CATEGORIES.indexOf(t.category) === -1) CATEGORIES.push(t.category);
  });

  var byPage = {};
  TOPICS.forEach(function (t) { byPage[t.page] = t; });

  var listEl = document.getElementById('topic-list');
  var detailEl = document.getElementById('topic-detail');
  var searchEl = document.getElementById('search-input');
  var countEl = document.getElementById('topic-count-num');
  var categorySelect = document.getElementById('category-select');

  var ALL_CATEGORIES = 'all';
  var currentCategory = ALL_CATEGORIES;
  var currentPage = null;

  var categoryOptions = '<option value="' + ALL_CATEGORIES + '">All Topics (' + TOPICS.length + ')</option>' +
    CATEGORIES.map(function (c) {
      var count = TOPICS.filter(function (t) { return t.category === c; }).length;
      return '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + ' (' + count + ')</option>';
    }).join('');
  categorySelect.innerHTML = categoryOptions;

  function renderList(filterText) {
    var filtered = TOPICS.filter(function (t) {
      if (currentCategory !== ALL_CATEGORIES && t.category !== currentCategory) return false;
      if (!filterText) return true;
      return t.name.toLowerCase().indexOf(filterText.toLowerCase()) !== -1 ||
        t.list_label.toLowerCase().indexOf(filterText.toLowerCase()) !== -1;
    });

    countEl.textContent = filtered.length;

    if (filtered.length === 0) {
      listEl.innerHTML = '<li class="no-match">No matches in this view.</li>';
      return;
    }

    listEl.innerHTML = filtered
      .map(function (t) {
        return '<li data-page="' + t.page + '">' + escapeHtml(t.list_label) + '</li>';
      })
      .join('');
  }

  function showEmptyState() {
    detailEl.innerHTML =
      '<div class="empty-state">' +
      '<h2>Choose a topic to open it</h2>' +
      '<p>Browse by curriculum year and review-system stage on the left, or search across all ' + TOPICS.length + ' topics. Each topic includes its checklists, mastery outcomes and linked learning resources straight from the Health Sciences Academy catalog.</p>' +
      '</div>';
  }

  function renderTopicView(topic) {
    detailEl.innerHTML = renderTopic(topic);
    document.querySelectorAll('#topic-list li[data-page]').forEach(function (li) {
      li.classList.toggle('active', li.getAttribute('data-page') === String(topic.page));
    });
    detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function selectTopic(page, updatePath) {
    var topic = byPage[page];
    if (!topic) return;
    currentPage = page;
    if (currentCategory !== ALL_CATEGORIES && topic.category !== currentCategory) {
      currentCategory = topic.category;
      categorySelect.value = currentCategory;
      renderList(searchEl.value.trim());
    }
    renderTopicView(topic);
    if (updatePath) {
      history.pushState(null, '', '/health-sciences/topics/' + page + '/');
    }
  }

  function setCategory(cat) {
    currentCategory = cat;
    categorySelect.value = cat;
    renderList(searchEl.value.trim());
  }

  listEl.addEventListener('click', function (e) {
    var li = e.target.closest('li[data-page]');
    if (!li) return;
    selectTopic(parseInt(li.getAttribute('data-page'), 10), true);
  });

  detailEl.addEventListener('click', function (e) {
    var copyBtn = e.target.closest('[data-copy-url]');
    if (!copyBtn) return;
    var copyUrl = copyBtn.getAttribute('data-copy-url');
    var done = function () {
      var original = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(function () { copyBtn.textContent = original; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(copyUrl).then(done, done);
    } else {
      done();
    }
  });

  // Signup gate: browsing topics is free, but opening an actual resource
  // link requires a (free) signup. Capture phase so it intercepts before
  // the browser navigates.
  detailEl.addEventListener('click', function (e) {
    if (!window.ZuyiniGate) return;
    var link = e.target.closest('.hsa-table a, .hsa-bullets a');
    if (!link || window.ZuyiniGate.hasAccess()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    window.ZuyiniGate.requireAccess(function () {
      window.open(link.href, '_blank', 'noopener,noreferrer');
    });
  }, true);

  categorySelect.addEventListener('change', function () {
    currentPage = null;
    showEmptyState();
    setCategory(categorySelect.value);
    history.pushState(null, '', '/health-sciences/');
  });

  searchEl.addEventListener('input', function () {
    renderList(searchEl.value.trim());
  });

  // Skill finder: an optional, free-text search across every topic's full
  // content (not just its title) for visitors who don't know the
  // curriculum structure and just want to say what they're studying.
  // Pure client-side keyword scoring -- no server, no database.
  var skillFinderForm = document.getElementById('skill-finder-form');
  var skillFinderInput = document.getElementById('skill-finder-input');
  var skillIndex = null;

  function topicSnippet(topic) {
    for (var i = 0; i < topic.sections.length; i++) {
      var s = topic.sections[i];
      if (s.type === 'paragraph' && s.text) return s.text;
      if (s.type === 'bullets' && s.items && s.items.length) return s.items.join('. ');
    }
    return topic.name + ': mastery checklists and linked learning resources from the Zuyini Health Sciences Academy.';
  }

  function topicBlob(topic) {
    var parts = [topic.name, topic.list_label, topic.phase, topic.category];
    topic.sections.forEach(function (s) {
      if (s.heading) parts.push(s.heading);
      if (s.type === 'paragraph') parts.push(s.text);
      else if (s.type === 'bullets') parts.push((s.items || []).join(' '));
      else if (s.type === 'table') {
        parts.push((s.columns || []).join(' '));
        (s.rows || []).forEach(function (row) {
          row.forEach(function (cell) {
            if (cell && !/^https?:\/\//i.test(cell)) parts.push(cell);
          });
        });
      }
    });
    return parts.join(' ');
  }

  function buildSkillIndex() {
    return TOPICS.map(function (t) {
      return { page: t.page, name: t.name, snippet: topicSnippet(t), blob: topicBlob(t) };
    });
  }

  var SKILL_STOPWORDS = { the: 1, a: 1, an: 1, of: 1, to: 1, in: 1, on: 1, at: 1, is: 1, it: 1, and: 1, or: 1, for: 1, with: 1, no: 1, not: 1, be: 1, as: 1, by: 1, so: 1, my: 1, i: 1, me: 1, you: 1, your: 1, are: 1, do: 1, does: 1 };

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function scoreEntry(words, entry) {
    var nameLower = entry.name.toLowerCase();
    var blobLower = entry.blob.toLowerCase();
    var score = 0;
    words.forEach(function (w) {
      if (SKILL_STOPWORDS[w]) return;
      var re = new RegExp('\\b' + escapeRegExp(w) + '\\b', 'g');
      if (re.test(nameLower)) score += 12;
      var matches = blobLower.match(re);
      if (matches) score += Math.min(matches.length, 5) * 2;
    });
    return score;
  }

  function searchSkills(query) {
    if (!skillIndex) skillIndex = buildSkillIndex();
    var words = query.toLowerCase().split(/[^a-z0-9+.#]+/).filter(function (w) { return w.length > 1; });
    if (!words.length) return [];
    var scored = skillIndex
      .map(function (entry) { return { entry: entry, score: scoreEntry(words, entry) }; })
      .filter(function (s) { return s.score > 0; });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, 3).map(function (s) { return s.entry; });
  }

  function truncateSnippet(str, n) {
    str = (str || '').replace(/\s+/g, ' ').trim();
    return str.length > n ? str.slice(0, n - 1).trim() + '…' : str;
  }

  function renderSkillResults(query, results) {
    var body;
    if (!results.length) {
      body = '<div class="skill-results-empty">No close matches for &ldquo;' + escapeHtml(query) +
        '&rdquo;. Try a broader term, or browse by curriculum year and review stage on the left.</div>';
    } else {
      body = results.map(function (r) {
        return '<button type="button" class="skill-result-card" data-skill-page="' + r.page + '">' +
          '<span class="skill-result-type">Topic</span>' +
          '<p class="skill-result-name">' + escapeHtml(r.name) + '</p>' +
          '<p class="skill-result-snippet">' + escapeHtml(truncateSnippet(r.snippet, 160)) + '</p>' +
          '</button>';
      }).join('');
    }
    detailEl.innerHTML =
      '<div class="skill-results"><div class="detail-card">' +
      '<h2>Best matches for your topic</h2>' +
      '<p class="skill-results-query">Showing top results for &ldquo;<strong>' + escapeHtml(query) + '</strong>&rdquo;</p>' +
      body +
      '</div></div>';
    detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (skillFinderForm && skillFinderInput) {
    skillFinderForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var query = skillFinderInput.value.trim();
      if (!query) return;
      renderSkillResults(query, searchSkills(query));
    });

    detailEl.addEventListener('click', function (e) {
      var card = e.target.closest('.skill-result-card');
      if (!card) return;
      var page = parseInt(card.getAttribute('data-skill-page'), 10);
      var topic = byPage[page];
      if (!topic) return;
      currentCategory = topic.category;
      categorySelect.value = currentCategory;
      renderList('');
      selectTopic(page, true);
    });
  }

  function routeFromPath() {
    var parts = location.pathname.replace(/^\/health-sciences\/?/, '').split('/').filter(Boolean);
    if (parts[0] === 'topics' && parts[1]) {
      var page = parseInt(parts[1], 10);
      var topic = byPage[page];
      if (topic) {
        currentCategory = topic.category;
        categorySelect.value = currentCategory;
        renderList('');
        selectTopic(page, false);
        return;
      }
    }
    setCategory(ALL_CATEGORIES);
    showEmptyState();
  }

  window.addEventListener('popstate', routeFromPath);
  routeFromPath();
})();
