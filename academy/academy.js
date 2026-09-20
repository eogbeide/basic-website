(function () {
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

  function courseSlug(name) {
    return slugify(name.replace(/^C\d{2,3}\s+/i, ''));
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
      (c.coverage ? '<p class="competency-coverage">Coverage: ' + escapeHtml(c.coverage) + '</p>' : '') +
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
    var bonus = (role.bonus || [])
      .map(function (b) {
        var url = b.url ? escapeHtml(b.url) : '#';
        var channel = b.channel ? ' &mdash; ' + escapeHtml(b.channel) : '';
        return (
          '<li><a href="' + url + '" target="_blank" rel="noopener noreferrer">' +
          '<span class="play-icon">&#9654;</span><span>' +
          (b.label ? '<strong>' + escapeHtml(b.label) + ':</strong> ' : '') +
          escapeHtml(b.title) + channel + '</span></a></li>'
        );
      })
      .join('');
    return (
      '<div class="detail-card">' +
      '<h2>' + escapeHtml(role.name) + '</h2>' +
      (role.benchmark ? '<p class="detail-benchmark">Benchmark: ' + escapeHtml(role.benchmark) + '</p>' : '') +
      role.levels.map(renderLevel).join('') +
      (bonus
        ? '<div class="cross-links-block"><h3>Bonus Quick Explainer</h3><ul class="video-links">' + bonus + '</ul></div>'
        : '') +
      (role.capstone
        ? '<div class="capstone-block"><h3>Role-Readiness Proof / Capstone</h3><p>' + escapeHtml(role.capstone) + '</p></div>'
        : '') +
      (role.rubric
        ? '<div class="rubric-block"><h3>Proof Rubric</h3><p>' + escapeHtml(role.rubric) + '</p></div>'
        : '') +
      '</div>'
    );
  }

  var COURSES_LIST = (typeof COURSES_DATA !== 'undefined' ? COURSES_DATA : []);
  var coursesBySlug = {};
  COURSES_LIST.forEach(function (c) {
    coursesBySlug[courseSlug(c.name)] = c;
  });

  function renderCourseListItem(c) {
    var title = escapeHtml(typeof c === 'string' ? c : c.title);
    var rawName = typeof c === 'string' ? c : c.title;
    var slug = courseSlug(rawName);
    if (coursesBySlug[slug]) {
      return '<li><button type="button" class="course-link" data-cross-course="' + escapeHtml(slug) + '">' + title + '</button></li>';
    }
    var url = (c && c.url) ? escapeHtml(c.url) : null;
    return url
      ? '<li><a href="' + url + '" target="_blank" rel="noopener noreferrer">' + title + '</a></li>'
      : '<li>' + title + '</li>';
  }

  function renderCourseVideo(v) {
    var title = escapeHtml(v.title || 'Watch');
    var url = v.url ? escapeHtml(v.url) : '#';
    var channel = v.channel ? ' &mdash; ' + escapeHtml(v.channel) : '';
    var time = v.time ? ' <span class="video-time">(' + escapeHtml(v.time) + ')</span>' : '';
    return (
      '<li><a href="' + url + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="play-icon">&#9654;</span><span>' + title + channel + time +
      (v.why ? '<br><span class="video-why">' + escapeHtml(v.why) + '</span>' : '') +
      '</span></a></li>'
    );
  }

  function renderCourse(course, backTarget) {
    var back = backTarget
      ? '<button type="button" class="back-link" data-back-to="' + escapeHtml(backTarget.mode) + '/' + escapeHtml(backTarget.slug) + '">&larr; Back to ' + escapeHtml(backTarget.label) + '</button>'
      : '';
    var levels = (course.levels || [])
      .map(function (lvl) {
        if (!lvl.videos || !lvl.videos.length) return '';
        return (
          '<div class="level-block">' +
          '<span class="level-badge ' + levelClass(lvl.level) + '">' + escapeHtml(lvl.level) + '</span>' +
          '<ul class="video-links">' + lvl.videos.map(renderCourseVideo).join('') + '</ul>' +
          '</div>'
        );
      })
      .join('');
    var handsOn = course.hands_on
      ? '<div class="capstone-block"><h3>Hands-On Mastery</h3><ul class="video-links">' + renderCourseVideo(course.hands_on) + '</ul></div>'
      : '';
    return (
      '<div class="detail-card">' +
      back +
      '<h2>' + escapeHtml(course.name) + '</h2>' +
      (course.description ? '<p class="detail-description">' + escapeHtml(course.description) + '</p>' : '') +
      levels +
      handsOn +
      '</div>'
    );
  }

  function renderPathway(pathway) {
    var roleLinks = (pathway.representative_roles || [])
      .map(function (r) {
        return '<button type="button" class="role-pill" data-cross-role="' + escapeHtml(slugify(r)) + '">' + escapeHtml(r) + '</button>';
      })
      .join('');
    var courses = (pathway.course_sequence || [])
      .map(function (c) { return renderCourseListItem(c); })
      .join('');
    var resources = (pathway.capability_resources || [])
      .map(function (r) {
        var url = r.url ? escapeHtml(r.url) : '#';
        var channel = r.channel ? ' &mdash; ' + escapeHtml(r.channel) : '';
        return (
          '<li><a href="' + url + '" target="_blank" rel="noopener noreferrer">' +
          '<span class="play-icon">&#9654;</span><span><strong>' + escapeHtml(r.label) + ':</strong> ' +
          escapeHtml(r.title) + channel + '</span></a></li>'
        );
      })
      .join('');
    return (
      '<div class="detail-card">' +
      '<h2>' + escapeHtml(pathway.name) + '</h2>' +
      (pathway.description ? '<p class="detail-description">' + escapeHtml(pathway.description) + '</p>' : '') +
      (pathway.market_basis ? '<p class="detail-benchmark">Market Basis: ' + escapeHtml(pathway.market_basis) + '</p>' : '') +
      (roleLinks
        ? '<div class="cross-links-block"><h3>Representative Roles</h3><div class="role-pills">' + roleLinks + '</div></div>'
        : '') +
      (courses
        ? '<div class="course-sequence-block"><h3>Course Sequence</h3><ol class="course-sequence">' + courses + '</ol></div>'
        : '') +
      (resources
        ? '<div class="cross-links-block"><h3>Direct Video Bridges</h3><ul class="video-links">' + resources + '</ul></div>'
        : '') +
      '</div>'
    );
  }

  function renderCertificate(cert) {
    var tiers = (cert.tiers || [])
      .map(function (t) {
        var courses = (t.courses || [])
          .map(function (c) { return renderCourseListItem(c); })
          .join('');
        var bridges = (t.bridges || [])
          .map(function (b) {
            var topic = escapeHtml(typeof b === 'string' ? b : b.topic);
            var url = (b && b.url) ? escapeHtml(b.url) : null;
            return url
              ? '<li><a href="' + url + '" target="_blank" rel="noopener noreferrer"><span class="play-icon">&#9654;</span><span>' + topic + '</span></a></li>'
              : '<li>' + topic + '</li>';
          })
          .join('');
        return (
          '<div class="tier-block">' +
          '<p class="tier-label">' + escapeHtml(t.tier) + '</p>' +
          (courses ? '<ul class="tier-courses">' + courses + '</ul>' : '') +
          (bridges ? '<p class="tier-bridges-label">Bridge Topics</p><ul class="tier-bridges">' + bridges + '</ul>' : '') +
          '</div>'
        );
      })
      .join('');
    var resourceLinks = (cert.resource_links || [])
      .map(function (r) {
        var url = r.url ? escapeHtml(r.url) : '#';
        return (
          '<li><a href="' + url + '" target="_blank" rel="noopener noreferrer">' +
          '<span class="play-icon">&#9654;</span><span>' + escapeHtml(r.competency) +
          ' &mdash; ' + escapeHtml(r.coverage) + '</span></a></li>'
        );
      })
      .join('');
    return (
      '<div class="detail-card">' +
      '<h2>' + escapeHtml(cert.name) + '</h2>' +
      (cert.description ? '<p class="detail-description">' + escapeHtml(cert.description) + '</p>' : '') +
      (cert.university_benchmark ? '<p class="detail-benchmark">University Curriculum Benchmark: ' + escapeHtml(cert.university_benchmark) + '</p>' : '') +
      tiers +
      (resourceLinks
        ? '<div class="cross-links-block"><h3>Direct Learning Bridges</h3><ul class="video-links">' + resourceLinks + '</ul></div>'
        : '') +
      (cert.capstone
        ? '<div class="capstone-block"><h3>Integrative Capstone</h3><p>' + escapeHtml(cert.capstone) + '</p></div>'
        : '') +
      (cert.evidence_standard
        ? '<div class="rubric-block"><h3>Evidence Standard</h3><p>' + escapeHtml(cert.evidence_standard) + '</p></div>'
        : '') +
      '</div>'
    );
  }

  var MODES = {
    roles: {
      label: 'roles',
      data: (typeof ROLES_DATA !== 'undefined' ? ROLES_DATA : []).slice().sort(function (a, b) { return a.name.localeCompare(b.name); }),
      searchPlaceholder: 'Search roles, e.g. AI Engineer, UX, Finance...',
      emptyTitle: 'Choose a role to open its mastery path',
      emptyBody: 'Search by title or scroll the list on the left. Every role includes 6 core competencies, 12 direct video bridges and a hands-on capstone.',
      render: renderRole,
    },
    pathways: {
      label: 'learning pathways',
      data: (typeof PATHWAYS_DATA !== 'undefined' ? PATHWAYS_DATA : []).slice().sort(function (a, b) { return a.name.localeCompare(b.name); }),
      searchPlaceholder: 'Search pathways, e.g. AI, Cloud, Design...',
      emptyTitle: 'Choose a learning pathway',
      emptyBody: 'Pathways move through one discipline end-to-end: foundations, build, operate, optimize and lead, with a curated course sequence and representative roles.',
      render: renderPathway,
    },
    certificates: {
      label: 'academic certificates',
      data: (typeof CERTIFICATES_DATA !== 'undefined' ? CERTIFICATES_DATA : []).slice().sort(function (a, b) { return a.name.localeCompare(b.name); }),
      searchPlaceholder: 'Search certificates, e.g. Computer Science, Physics...',
      emptyTitle: 'Choose an academic certificate',
      emptyBody: 'University-benchmarked, major-inspired curricula spanning foundations, intermediate core and advanced specialization, each with an integrative capstone.',
      render: renderCertificate,
    },
  };

  Object.keys(MODES).forEach(function (key) {
    var bySlug = {};
    MODES[key].data.forEach(function (item) {
      bySlug[slugify(item.name)] = item;
    });
    MODES[key].bySlug = bySlug;
  });

  var listEl = document.getElementById('role-list');
  var detailEl = document.getElementById('role-detail');
  var searchEl = document.getElementById('search-input');
  var countEl = document.getElementById('role-count-num');
  var countLabelEl = document.getElementById('role-count-label');
  var toggleButtons = document.querySelectorAll('.mode-toggle button[data-mode]');

  var currentMode = 'roles';
  var currentSlug = null;
  var currentItemName = '';

  function renderList(filterText) {
    var mode = MODES[currentMode];
    var filtered = mode.data.filter(function (item) {
      if (!filterText) return true;
      return item.name.toLowerCase().indexOf(filterText.toLowerCase()) !== -1;
    });

    countEl.textContent = filtered.length;
    if (countLabelEl) countLabelEl.textContent = mode.label;

    if (filtered.length === 0) {
      listEl.innerHTML = '<li class="no-match">No matches in this view.</li>';
      return;
    }

    listEl.innerHTML = filtered
      .map(function (item) {
        return '<li data-slug="' + slugify(item.name) + '">' + escapeHtml(item.name) + '</li>';
      })
      .join('');
  }

  function showEmptyState() {
    var mode = MODES[currentMode];
    detailEl.innerHTML =
      '<div class="empty-state">' +
      '<h2>' + escapeHtml(mode.emptyTitle) + '</h2>' +
      '<p>' + escapeHtml(mode.emptyBody) + '</p>' +
      '</div>';
  }

  function renderItem(item) {
    detailEl.innerHTML = MODES[currentMode].render(item);

    document.querySelectorAll('.role-list li[data-slug]').forEach(function (li) {
      li.classList.toggle('active', li.getAttribute('data-slug') === slugify(item.name));
    });

    detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function selectItem(slug, updateHash) {
    var item = MODES[currentMode].bySlug[slug];
    if (!item) return;
    currentSlug = slug;
    currentItemName = item.name;
    renderItem(item);
    if (updateHash) {
      history.replaceState(null, '', '#' + currentMode + '/' + slug);
    }
  }

  function showCourse(slug, backTarget, updateHash) {
    var course = coursesBySlug[slug];
    if (!course) return;
    detailEl.innerHTML = renderCourse(course, backTarget);
    detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (updateHash) {
      history.replaceState(null, '', '#course/' + slug);
    }
  }

  function setMode(mode, slug, updateHash) {
    if (!MODES[mode]) return;
    currentMode = mode;

    toggleButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
    if (searchEl) {
      searchEl.value = '';
      searchEl.placeholder = MODES[mode].searchPlaceholder;
    }

    renderList('');

    if (slug && MODES[mode].bySlug[slug]) {
      selectItem(slug, false);
    } else {
      currentSlug = null;
      currentItemName = '';
      showEmptyState();
    }

    if (updateHash) {
      history.replaceState(null, '', slug ? '#' + mode + '/' + slug : '#' + mode);
    }
  }

  listEl.addEventListener('click', function (e) {
    var li = e.target.closest('li[data-slug]');
    if (!li) return;
    selectItem(li.getAttribute('data-slug'), true);
  });

  detailEl.addEventListener('click', function (e) {
    var pill = e.target.closest('[data-cross-role]');
    if (pill) {
      setMode('roles', pill.getAttribute('data-cross-role'), true);
      return;
    }
    var courseBtn = e.target.closest('[data-cross-course]');
    if (courseBtn) {
      var backTarget = currentSlug ? { mode: currentMode, slug: currentSlug, label: currentItemName } : null;
      showCourse(courseBtn.getAttribute('data-cross-course'), backTarget, true);
      return;
    }
    var backBtn = e.target.closest('[data-back-to]');
    if (backBtn) {
      var parts = backBtn.getAttribute('data-back-to').split('/');
      setMode(parts[0], parts[1], true);
      return;
    }
  });

  toggleButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setMode(btn.getAttribute('data-mode'), null, true);
    });
  });

  searchEl.addEventListener('input', function () {
    renderList(searchEl.value.trim());
  });

  function routeFromHash() {
    var parts = location.hash.replace('#', '').split('/');
    if (parts[0] === 'course' && parts[1]) {
      showCourse(parts[1], null, false);
    } else if (parts[0] && MODES[parts[0]]) {
      setMode(parts[0], parts[1], false);
    } else {
      setMode('roles', null, false);
    }
  }

  window.addEventListener('hashchange', routeFromHash);
  routeFromHash();
})();
