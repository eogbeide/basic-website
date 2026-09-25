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

  function renderTopic(topic) {
    return (
      '<div class="detail-card">' +
      '<h2>' + escapeHtml(topic.name) + '</h2>' +
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

  categorySelect.addEventListener('change', function () {
    currentPage = null;
    showEmptyState();
    setCategory(categorySelect.value);
    history.pushState(null, '', '/health-sciences/');
  });

  searchEl.addEventListener('input', function () {
    renderList(searchEl.value.trim());
  });

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
