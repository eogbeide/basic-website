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

  function renderLevel(lvl, index) {
    return (
      '<div class="level-block" data-level-index="' + index + '">' +
      '<span class="level-badge ' + levelClass(lvl.level) + '">' + escapeHtml(lvl.level) + '</span>' +
      (lvl.intro ? '<p class="level-intro">' + escapeHtml(lvl.intro) + '</p>' : '') +
      lvl.competencies.map(renderCompetency).join('') +
      '</div>'
    );
  }

  var ROLE_GUIDES_BY_NAME = {};
  (typeof ROLE_GUIDES_DATA !== 'undefined' ? ROLE_GUIDES_DATA : []).forEach(function (g) {
    ROLE_GUIDES_BY_NAME[g.role] = g;
  });

  function renderRoleGuide(role) {
    var guide = ROLE_GUIDES_BY_NAME[role.name];
    if (!guide) return '';
    var overview = (guide.overview || []).map(function (p) {
      return '<p>' + escapeHtml(p) + '</p>';
    }).join('');
    var tools = (guide.tools || []).length
      ? '<div class="guide-block"><h3>Tools of the Trade</h3><ul class="guide-list">' +
        guide.tools.map(function (t) { return '<li>' + escapeHtml(t) + '</li>'; }).join('') +
        '</ul></div>'
      : '';
    var readiness = (guide.readinessSignals || []).length
      ? '<div class="guide-block"><h3>How to Know You&rsquo;re Ready</h3><ul class="guide-list">' +
        guide.readinessSignals.map(function (s) { return '<li>' + escapeHtml(s) + '</li>'; }).join('') +
        '</ul></div>'
      : '';
    var questions = (guide.interviewQuestions || []).length
      ? '<div class="guide-block"><h3>Typical Interview Questions</h3><ul class="guide-list">' +
        guide.interviewQuestions.map(function (q) { return '<li>' + escapeHtml(q) + '</li>'; }).join('') +
        '</ul></div>'
      : '';
    var faq = (guide.faqs || []).length
      ? '<div class="guide-block guide-faq"><h3>FAQ</h3>' +
        guide.faqs.map(function (f) {
          return '<div class="guide-faq-item"><p class="guide-faq-q">' + escapeHtml(f.q) + '</p><p class="guide-faq-a">' + escapeHtml(f.a) + '</p></div>';
        }).join('') +
        '</div>'
      : '';
    return (
      '<div class="role-guide">' +
      '<div class="guide-overview">' + overview + '</div>' +
      tools + questions + readiness + faq +
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
      renderShareBar('https://zuyini.com/academy/roles/' + slugify(role.name) + '/', role.name + ' | Zuyini Academy') +
      (role.benchmark ? '<p class="detail-benchmark">Benchmark: ' + escapeHtml(role.benchmark) + '</p>' : '') +
      renderRoleGuide(role) +
      role.levels.map(function (lvl, i) { return renderLevel(lvl, i); }).join('') +
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
      renderShareBar('https://zuyini.com/academy/courses/' + courseSlug(course.name) + '/', course.name + ' | Zuyini Academy Course') +
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
      renderShareBar('https://zuyini.com/academy/pathways/' + slugify(pathway.name) + '/', pathway.name + ' | Zuyini Academy Learning Pathway') +
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
      renderShareBar('https://zuyini.com/academy/certificates/' + slugify(cert.name) + '/', cert.name + ' | Zuyini Academy') +
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
  var categorySelect = document.getElementById('category-select');
  var toggleButtons = document.querySelectorAll('.mode-toggle button[data-mode]');
  var ALL_CATEGORIES = 'all';
  var currentCategory = ALL_CATEGORIES;
  var heroStatButtons = document.querySelectorAll('.hero-stat[data-hero-mode]');

  var heroStatEl = {
    roles: document.getElementById('hero-stat-roles'),
    pathways: document.getElementById('hero-stat-pathways'),
    certificates: document.getElementById('hero-stat-certificates'),
  };
  Object.keys(heroStatEl).forEach(function (key) {
    if (heroStatEl[key] && MODES[key]) {
      heroStatEl[key].textContent = MODES[key].data.length;
    }
  });

  heroStatButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setMode(btn.getAttribute('data-hero-mode'), null, true);
      var panel = document.querySelector('.role-panel');
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  var currentMode = 'roles';
  var currentSlug = null;
  var currentItemName = '';

  function populateCategorySelect() {
    if (!categorySelect) return;
    var mode = MODES[currentMode];
    var categories = [];
    mode.data.forEach(function (item) {
      if (item.category && categories.indexOf(item.category) === -1) {
        categories.push(item.category);
      }
    });
    categories.sort();
    categorySelect.innerHTML = '<option value="' + ALL_CATEGORIES + '">All ' + escapeHtml(mode.label) + '</option>' +
      categories.map(function (c) {
        var count = mode.data.filter(function (item) { return item.category === c; }).length;
        return '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + ' (' + count + ')</option>';
      }).join('');
    categorySelect.value = ALL_CATEGORIES;
  }

  function renderList(filterText) {
    var mode = MODES[currentMode];
    var filtered = mode.data.filter(function (item) {
      if (currentCategory !== ALL_CATEGORIES && item.category !== currentCategory) return false;
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

  var MASTERY_LEVELS = [
    { min: 0, label: 'Not Started' },
    { min: 1, label: 'Explorer' },
    { min: 34, label: 'Builder' },
    { min: 67, label: 'Practitioner' },
    { min: 100, label: 'Master' },
  ];

  function masteryLevelFor(pct) {
    var label = MASTERY_LEVELS[0].label;
    for (var i = 0; i < MASTERY_LEVELS.length; i++) {
      if (pct >= MASTERY_LEVELS[i].min) label = MASTERY_LEVELS[i].label;
    }
    return label;
  }

  function masteryStorageKey(mode, slug) {
    return 'zuyini_mastery_' + mode + '_' + slug;
  }

  function loadMasteryState(mode, slug, count) {
    try {
      var raw = localStorage.getItem(masteryStorageKey(mode, slug));
      var arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) arr = [];
      while (arr.length < count) arr.push(false);
      return arr;
    } catch (e) {
      return new Array(count).fill(false);
    }
  }

  function saveMasteryState(mode, slug, arr) {
    try {
      localStorage.setItem(masteryStorageKey(mode, slug), JSON.stringify(arr));
    } catch (e) {
      // ignore -- worst case progress just doesn't persist this session
    }
  }

  function clickStorageKey(mode, slug) {
    return 'zuyini_clicked_' + mode + '_' + slug;
  }

  function loadClickState(mode, slug, count) {
    try {
      var raw = localStorage.getItem(clickStorageKey(mode, slug));
      var arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) arr = [];
      while (arr.length < count) arr.push(false);
      return arr;
    } catch (e) {
      return new Array(count).fill(false);
    }
  }

  function saveClickState(mode, slug, arr) {
    try {
      localStorage.setItem(clickStorageKey(mode, slug), JSON.stringify(arr));
    } catch (e) {
      // ignore
    }
  }

  function updateMasteryBadge(badgeEl, checkedCount, total) {
    var pct = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
    var level = masteryLevelFor(pct);
    badgeEl.innerHTML =
      '<div class="mastery-header">' +
      '<span class="mastery-level">' + escapeHtml(level) + '</span>' +
      '<span class="mastery-count">' + checkedCount + ' / ' + total + ' complete</span>' +
      '</div>' +
      '<div class="mastery-track"><div class="mastery-fill" style="width:' + pct + '%"></div></div>' +
      (pct < 100
        ? '<p class="mastery-hint">Open a video or resource link, watch it, then check its box to track your progress and unlock what comes next.</p>'
        : '');
  }

  function attachMasteryTracking(mode, slug) {
    if (mode !== 'roles' && mode !== 'pathways' && mode !== 'certificates') return;
    var card = detailEl.querySelector('.detail-card');
    var h2 = card && card.querySelector('h2');
    if (!card || !h2) return;

    var items = Array.prototype.filter.call(
      card.querySelectorAll('.video-links li, .tier-bridges li, .course-sequence li, .tier-courses li'),
      function (li) {
        if (li.querySelector('.play-icon')) return true; // a direct video/resource link
        return !!li.closest('.course-sequence, .tier-courses'); // a course-sequence entry (cross-link, external link, or plain text)
      }
    );
    if (!items.length) return;

    var state = loadMasteryState(mode, slug, items.length);
    var clickState = loadClickState(mode, slug, items.length);
    // A course-sequence entry with nothing to click (no matching course
    // page and no external link) has no "open it first" step to require.
    items.forEach(function (li, i) {
      if (!li.querySelector('a, button[data-cross-course]')) clickState[i] = true;
    });

    // Roles have an explicit Basic -> Intermediate -> Advanced ladder
    // (role.levels, always in that order); lock a level until every
    // trackable item in the level before it is checked off.
    var levelBlocks = mode === 'roles' ? Array.prototype.slice.call(card.querySelectorAll('.level-block')) : [];
    var itemLevelIndex = items.map(function (li) {
      var block = li.closest && li.closest('.level-block');
      return block ? parseInt(block.getAttribute('data-level-index'), 10) : -1;
    });
    var levelUnlocked = [];

    var badge = document.createElement('div');
    badge.className = 'mastery-badge';
    h2.insertAdjacentElement('afterend', badge);

    function computeLevelLocks() {
      levelUnlocked = [];
      if (!levelBlocks.length) return;
      var priorComplete = true;
      levelBlocks.forEach(function (block, levelIdx) {
        var indices = [];
        itemLevelIndex.forEach(function (li, i) { if (li === levelIdx) indices.push(i); });
        var checked = indices.filter(function (i) { return state[i]; }).length;
        var thisLevelComplete = indices.length === 0 || checked === indices.length;
        var unlocked = levelIdx === 0 || priorComplete;
        levelUnlocked[levelIdx] = unlocked;

        block.classList.toggle('level-locked', !unlocked);
        var banner = block.querySelector('.level-lock-banner');
        if (!unlocked && !banner) {
          banner = document.createElement('p');
          banner.className = 'level-lock-banner';
          banner.textContent = '🔒 Complete the previous level to unlock';
          block.insertBefore(banner, block.firstChild);
        } else if (unlocked && banner) {
          banner.remove();
        }
        priorComplete = priorComplete && thisLevelComplete;
      });
    }

    function isLevelLockedFor(i) {
      var levelIdx = itemLevelIndex[i];
      return levelIdx >= 0 && levelUnlocked[levelIdx] === false;
    }

    function refresh() {
      computeLevelLocks();
      updateMasteryBadge(badge, state.filter(Boolean).length, items.length);
      items.forEach(function (li, i) {
        var cb = li.querySelector('.mastery-check');
        if (!cb) return;
        cb.disabled = isLevelLockedFor(i) || !clickState[i];
        cb.title = clickState[i] ? '' : 'Open the link first to mark this complete';
      });
    }

    items.forEach(function (li, i) {
      var trigger = li.querySelector('a, button[data-cross-course]');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'mastery-check';
      cb.checked = !!state[i];
      cb.setAttribute('aria-label', 'Mark complete');
      li.insertBefore(cb, li.firstChild);
      cb.addEventListener('change', function () {
        state[i] = cb.checked;
        saveMasteryState(mode, slug, state);
        refresh();
      });
      if (trigger) {
        trigger.addEventListener('click', function () {
          if (!clickState[i]) {
            clickState[i] = true;
            saveClickState(mode, slug, clickState);
            refresh();
          }
        });
      }
    });

    refresh();
  }

  function renderItem(item) {
    detailEl.innerHTML = MODES[currentMode].render(item);
    attachMasteryTracking(currentMode, currentSlug);

    document.querySelectorAll('.role-list li[data-slug]').forEach(function (li) {
      li.classList.toggle('active', li.getAttribute('data-slug') === slugify(item.name));
    });

    detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function selectItem(slug, updatePath) {
    var item = MODES[currentMode].bySlug[slug];
    if (!item) return;
    currentSlug = slug;
    currentItemName = item.name;
    renderItem(item);
    if (updatePath) {
      history.pushState(null, '', '/academy/' + currentMode + '/' + slug + '/');
    }
  }

  function showCourse(slug, backTarget, updatePath) {
    var course = coursesBySlug[slug];
    if (!course) return;
    detailEl.innerHTML = renderCourse(course, backTarget);
    detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (updatePath) {
      history.pushState(null, '', '/academy/courses/' + slug + '/');
    }
  }

  function setMode(mode, slug, updatePath) {
    if (!MODES[mode]) return;
    currentMode = mode;
    currentCategory = ALL_CATEGORIES;

    toggleButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
    if (searchEl) {
      searchEl.value = '';
      searchEl.placeholder = MODES[mode].searchPlaceholder;
    }
    populateCategorySelect();

    renderList('');

    if (slug && MODES[mode].bySlug[slug]) {
      selectItem(slug, false);
    } else {
      currentSlug = null;
      currentItemName = '';
      showEmptyState();
    }

    if (updatePath) {
      history.pushState(null, '', slug ? '/academy/' + mode + '/' + slug + '/' : '/academy/');
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
    var copyBtn = e.target.closest('[data-copy-url]');
    if (copyBtn) {
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
      return;
    }
  });

  // Signup gate: browsing roles/pathways/certificates/courses is free, but
  // opening an actual video/course link requires a (free) signup. Runs in
  // the capture phase so it intercepts before mastery-tracking's own click
  // listener on the same link and before the browser navigates.
  detailEl.addEventListener('click', function (e) {
    if (!window.ZuyiniGate) return;
    var link = e.target.closest('.video-links a, .tier-bridges a, .course-sequence a, .tier-courses a');
    if (!link || window.ZuyiniGate.hasAccess()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    window.ZuyiniGate.requireAccess(function () {
      window.open(link.href, '_blank', 'noopener,noreferrer');
    });
  }, true);

  toggleButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setMode(btn.getAttribute('data-mode'), null, true);
    });
  });

  searchEl.addEventListener('input', function () {
    renderList(searchEl.value.trim());
  });

  if (categorySelect) {
    categorySelect.addEventListener('change', function () {
      currentCategory = categorySelect.value;
      renderList(searchEl.value.trim());
    });
  }

  // Skill finder: an optional, free-text cross-catalog search (roles,
  // pathways, certificates and individual courses all at once) for
  // visitors who don't know the catalog structure and just want to say
  // what they're trying to learn. Pure client-side keyword scoring --
  // no server, no database, just the data already loaded on the page.
  var skillFinderForm = document.getElementById('skill-finder-form');
  var skillFinderInput = document.getElementById('skill-finder-input');
  var skillIndex = null;

  function buildSkillIndex() {
    var index = [];
    MODES.roles.data.forEach(function (r) {
      var compText = [];
      (r.levels || []).forEach(function (lvl) {
        (lvl.competencies || []).forEach(function (c) {
          compText.push(c.title, c.coverage);
        });
      });
      index.push({
        type: 'roles',
        typeLabel: 'Role',
        slug: slugify(r.name),
        name: r.name,
        snippet: r.benchmark || '',
        blob: [r.name, r.benchmark, r.capstone, compText.join(' ')].join(' '),
      });
    });
    MODES.pathways.data.forEach(function (p) {
      var seqText = (p.course_sequence || []).map(function (c) { return c.title; }).join(' ');
      index.push({
        type: 'pathways',
        typeLabel: 'Learning Pathway',
        slug: slugify(p.name),
        name: p.name,
        snippet: p.description || '',
        blob: [p.name, p.description, p.market_basis, (p.representative_roles || []).join(' '), seqText].join(' '),
      });
    });
    MODES.certificates.data.forEach(function (c) {
      var tierText = (c.tiers || []).map(function (t) {
        return (t.courses || []).map(function (co) { return co.title; }).join(' ') + ' ' +
          (t.bridges || []).map(function (b) { return b.topic; }).join(' ');
      }).join(' ');
      index.push({
        type: 'certificates',
        typeLabel: 'Academic Certificate',
        slug: slugify(c.name),
        name: c.name,
        snippet: c.description || '',
        blob: [c.name, c.description, c.university_benchmark, tierText].join(' '),
      });
    });
    COURSES_LIST.forEach(function (co) {
      index.push({
        type: 'course',
        typeLabel: 'Course',
        slug: courseSlug(co.name),
        name: co.name,
        snippet: co.description || '',
        blob: [co.name, co.description].join(' '),
      });
    });
    return index;
  }

  var SKILL_STOPWORDS = { the: 1, a: 1, an: 1, of: 1, to: 1, in: 1, on: 1, at: 1, is: 1, it: 1, and: 1, or: 1, for: 1, with: 1, no: 1, not: 1, be: 1, as: 1, by: 1, so: 1, my: 1, i: 1, me: 1, you: 1, your: 1, are: 1, do: 1, does: 1 };

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  var SKILL_NAME_WEIGHT = 12;
  var SKILL_BLOB_WEIGHT = 2;
  var SKILL_BLOB_CAP = 5;
  var SKILL_MAX_PER_WORD = SKILL_NAME_WEIGHT + SKILL_BLOB_WEIGHT * SKILL_BLOB_CAP;

  function scoreEntry(words, entry) {
    var nameLower = entry.name.toLowerCase();
    var blobLower = entry.blob.toLowerCase();
    var score = 0;
    words.forEach(function (w) {
      var re = new RegExp('\\b' + escapeRegExp(w) + '\\b', 'g');
      if (re.test(nameLower)) score += SKILL_NAME_WEIGHT;
      var matches = blobLower.match(re);
      if (matches) score += Math.min(matches.length, SKILL_BLOB_CAP) * SKILL_BLOB_WEIGHT;
    });
    return score;
  }

  function toResult(s, maxPossible) {
    var percent = Math.max(1, Math.min(100, Math.round((s.score / maxPossible) * 100)));
    return {
      type: s.entry.type,
      typeLabel: s.entry.typeLabel,
      slug: s.entry.slug,
      name: s.entry.name,
      snippet: s.entry.snippet,
      matchPercent: percent,
    };
  }

  function searchSkills(query) {
    if (!skillIndex) skillIndex = buildSkillIndex();
    var words = query.toLowerCase().split(/[^a-z0-9+.#]+/).filter(function (w) {
      return w.length > 1 && !SKILL_STOPWORDS[w];
    });
    if (!words.length) return [];
    var maxPossible = words.length * SKILL_MAX_PER_WORD;
    var scored = skillIndex
      .map(function (entry) { return { entry: entry, score: scoreEntry(words, entry) }; })
      .filter(function (s) { return s.score > 0; });
    scored.sort(function (a, b) { return b.score - a.score; });

    var top = scored.slice(0, 3);

    // Roles/pathways/certificates carry far more searchable text (a
    // benchmark, capstone, rubric and a dozen competency tags) than a
    // standalone course (just a name + one-paragraph description), so a
    // course can be the most precisely-named match for a skill and still
    // get outscored on raw keyword volume. Guarantee its best match a slot
    // whenever one exists, rather than let it get crowded out entirely.
    var hasCourse = top.some(function (s) { return s.entry.type === 'course'; });
    if (!hasCourse) {
      var bestCourse = scored.find(function (s) { return s.entry.type === 'course'; });
      if (bestCourse) top = top.slice(0, 3).concat([bestCourse]);
    }

    return top.map(function (s) { return toResult(s, maxPossible); });
  }

  function truncateSnippet(str, n) {
    str = (str || '').replace(/\s+/g, ' ').trim();
    return str.length > n ? str.slice(0, n - 1).trim() + '…' : str;
  }

  function renderSkillResults(query, results) {
    var body;
    if (!results.length) {
      body = '<div class="skill-results-empty">No close matches for &ldquo;' + escapeHtml(query) +
        '&rdquo;. Try a broader term, or browse Roles, Pathways and Certificates on the left.</div>';
    } else {
      body = results.map(function (r) {
        return '<button type="button" class="skill-result-card" data-skill-type="' + r.type +
          '" data-skill-slug="' + escapeHtml(r.slug) + '">' +
          '<span class="skill-result-badges">' +
          '<span class="skill-result-type">' + escapeHtml(r.typeLabel) + '</span>' +
          '<span class="skill-result-match">' + r.matchPercent + '% match</span>' +
          '</span>' +
          '<p class="skill-result-name">' + escapeHtml(r.name) + '</p>' +
          '<p class="skill-result-snippet">' + escapeHtml(truncateSnippet(r.snippet, 160)) + '</p>' +
          '</button>';
      }).join('');
    }
    detailEl.innerHTML =
      '<div class="skill-results"><div class="detail-card">' +
      '<h2>Best matches for your skill</h2>' +
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
      var type = card.getAttribute('data-skill-type');
      var slug = card.getAttribute('data-skill-slug');
      if (type === 'course') {
        showCourse(slug, null, true);
      } else {
        setMode(type, slug, true);
      }
    });
  }

  function routeFromPath() {
    var parts = location.pathname.replace(/^\/academy\/?/, '').split('/').filter(Boolean);
    if (parts[0] === 'courses' && parts[1]) {
      showCourse(parts[1], null, false);
    } else if (parts[0] && MODES[parts[0]]) {
      setMode(parts[0], parts[1], false);
    } else {
      setMode('roles', null, false);
    }
  }

  window.addEventListener('popstate', routeFromPath);
  routeFromPath();
})();
