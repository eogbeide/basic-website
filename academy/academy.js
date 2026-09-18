(function () {
  var roles = ROLES_DATA.slice().sort(function (a, b) {
    return a.name.localeCompare(b.name);
  });

  var listEl = document.getElementById('role-list');
  var detailEl = document.getElementById('role-detail');
  var searchEl = document.getElementById('search-input');
  var countEl = document.getElementById('role-count-num');

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  var bySlug = {};
  roles.forEach(function (r) {
    bySlug[slugify(r.name)] = r;
  });

  function renderList(filterText) {
    var filtered = roles.filter(function (r) {
      if (!filterText) return true;
      return r.name.toLowerCase().indexOf(filterText.toLowerCase()) !== -1;
    });

    countEl.textContent = filtered.length;

    if (filtered.length === 0) {
      listEl.innerHTML = '<li class="no-match">No roles match your search.</li>';
      return;
    }

    listEl.innerHTML = filtered
      .map(function (r) {
        return '<li data-slug="' + slugify(r.name) + '">' + escapeHtml(r.name) + '</li>';
      })
      .join('');
  }

  function levelClass(level) {
    return level.toLowerCase();
  }

  function renderVideo(v) {
    var title = escapeHtml(v.title || 'Watch');
    var url = v.url ? escapeHtml(v.url) : '#';
    var channel = v.channel ? ' &mdash; ' + escapeHtml(v.channel) : '';
    return (
      '<li><a href="' + url + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="play-icon">&#9654;</span><span>' + title + channel + '</span>' +
      '</a></li>'
    );
  }

  function renderCompetency(c) {
    return (
      '<div class="competency">' +
      '<p class="competency-title">' + escapeHtml(c.title) + '</p>' +
      '<p class="competency-coverage">Coverage: ' + escapeHtml(c.coverage) + '</p>' +
      '<ul class="video-links">' + c.videos.map(renderVideo).join('') + '</ul>' +
      '</div>'
    );
  }

  function renderLevel(lvl) {
    return (
      '<div class="level-block">' +
      '<span class="level-badge ' + levelClass(lvl.level) + '">' + escapeHtml(lvl.level) + '</span>' +
      (lvl.intro ? '<p class="level-intro">' + escapeHtml(lvl.intro) + '</p>' : '') +
      lvl.competencies.map(renderCompetency).join('') +
      '</div>'
    );
  }

  function renderRole(role) {
    detailEl.innerHTML =
      '<div class="role-card">' +
      '<h2>' + escapeHtml(role.name) + '</h2>' +
      (role.benchmark ? '<p class="role-benchmark">Benchmark: ' + escapeHtml(role.benchmark) + '</p>' : '') +
      role.levels.map(renderLevel).join('') +
      (role.capstone
        ? '<div class="capstone-block"><h3>Role-Readiness Proof / Capstone</h3><p>' + escapeHtml(role.capstone) + '</p></div>'
        : '') +
      (role.rubric
        ? '<div class="rubric-block"><h3>Proof Rubric</h3><p>' + escapeHtml(role.rubric) + '</p></div>'
        : '') +
      '</div>';

    document.querySelectorAll('.role-list li[data-slug]').forEach(function (li) {
      li.classList.toggle('active', li.getAttribute('data-slug') === slugify(role.name));
    });

    detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function selectRole(slug, updateHash) {
    var role = bySlug[slug];
    if (!role) return;
    renderRole(role);
    if (updateHash) {
      history.replaceState(null, '', '#' + slug);
    }
  }

  listEl.addEventListener('click', function (e) {
    var li = e.target.closest('li[data-slug]');
    if (!li) return;
    selectRole(li.getAttribute('data-slug'), true);
  });

  searchEl.addEventListener('input', function () {
    renderList(searchEl.value.trim());
  });

  window.addEventListener('hashchange', function () {
    var slug = location.hash.replace('#', '');
    if (slug) selectRole(slug, false);
  });

  renderList('');

  var initialSlug = location.hash.replace('#', '');
  if (initialSlug && bySlug[initialSlug]) {
    selectRole(initialSlug, false);
  }
})();
