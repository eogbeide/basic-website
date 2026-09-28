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

  // Rubrics arrive as one semicolon-separated sentence; render each clause
  // as its own checklist item instead of one dense paragraph, so a learner
  // can self-assess criterion by criterion. Falls back to a plain
  // paragraph for anything that doesn't actually split into multiple
  // clauses (e.g. a one-sentence standard).
  function renderRubricBody(text) {
    if (!text) return '';
    var parts = text
      .split(/;\s+/)
      .map(function (s) { return s.replace(/\.\s*$/, '').trim(); })
      .filter(Boolean);
    if (parts.length < 2) return '<p>' + escapeHtml(text) + '</p>';
    return '<ul class="rubric-list">' + parts.map(function (p) { return '<li>' + escapeHtml(p) + '</li>'; }).join('') + '</ul>';
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

  function renderCompetency(c, coverageLabel) {
    var label = coverageLabel || 'Coverage';
    var text = c.coverage != null ? c.coverage : c.practice;
    return (
      '<div class="competency">' +
      '<p class="competency-title">' + escapeHtml(c.title) + '</p>' +
      (text ? '<p class="competency-coverage">' + escapeHtml(label) + ': ' + escapeHtml(text) + '</p>' : '') +
      '<ul class="video-links">' + c.videos.map(renderVideo).join('') + '</ul>' +
      '</div>'
    );
  }

  function renderLevel(lvl, index, coverageLabel) {
    return (
      '<div class="level-block" data-level-index="' + index + '">' +
      '<span class="level-badge ' + levelClass(lvl.level) + '">' + escapeHtml(lvl.level) + '</span>' +
      (lvl.intro ? '<p class="level-intro">' + escapeHtml(lvl.intro) + '</p>' : '') +
      lvl.competencies.map(function (c) { return renderCompetency(c, coverageLabel); }).join('') +
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
      '<details class="role-guide">' +
      '<summary class="role-guide-summary">Full Role Guide &mdash; What This Role Actually Does, Tools, Interview Questions &amp; FAQ</summary>' +
      '<div class="role-guide-body">' +
      '<div class="guide-overview">' + overview + '</div>' +
      tools + questions + readiness + faq +
      '</div>' +
      '</details>'
    );
  }

  var INTERVIEW_TRACKS = (typeof INTERVIEW_PREP_DATA !== 'undefined' ? INTERVIEW_PREP_DATA : []);
  var INTERVIEW_TRACK_BY_ROLE = {};
  INTERVIEW_TRACKS.forEach(function (t) {
    if (t.relatedRole) INTERVIEW_TRACK_BY_ROLE[t.relatedRole] = t;
  });

  function renderInterviewTrackBody(track) {
    return (
      (track.subtitle ? '<p class="detail-description">' + escapeHtml(track.subtitle) + '</p>' : '') +
      (track.benchmark ? '<p class="detail-benchmark">Benchmark: ' + escapeHtml(track.benchmark) + '</p>' : '') +
      track.levels.map(function (lvl, i) { return renderLevel(lvl, i, 'Practice'); }).join('') +
      (track.capstone
        ? '<div class="capstone-block"><h3>Interview-Readiness Proof / Practice Loop</h3><p>' + escapeHtml(track.capstone) + '</p></div>'
        : '') +
      (track.rubric
        ? '<div class="rubric-block"><h3>Pass Rubric</h3>' + renderRubricBody(track.rubric) + '</div>'
        : '')
    );
  }

  function renderInterviewTrack(track) {
    return (
      '<div class="detail-card">' +
      '<h2>' + escapeHtml(track.name) + '</h2>' +
      renderShareBar('https://zuyini.com/academy/interview/' + slugify(track.name) + '/', track.name + ' Interview Prep | Zuyini Academy') +
      renderInterviewTrackBody(track) +
      '</div>'
    );
  }

  // A same-category sample rather than the full 194-role list every page
  // already links to via the sidebar -- keeps that sidebar for crawlable
  // full-catalog navigation while giving readers a short, scannable "see
  // also" set without repeating the whole directory in the main content.
  function renderRelatedRoles(role) {
    var siblings = MODES.roles.data.filter(function (r) { return r.category === role.category && r.name !== role.name; });
    if (!siblings.length) return '';
    var picks = siblings.slice(0, 6);
    var pills = picks
      .map(function (r) {
        return '<button type="button" class="role-pill" data-cross-role="' + escapeHtml(slugify(r.name)) + '">' + escapeHtml(r.name) + '</button>';
      })
      .join('');
    return (
      '<div class="cross-links-block"><h3>Related Roles</h3><div class="role-pills">' + pills + '</div></div>'
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

    var masteryPanel =
      renderRoleGuide(role) +
      role.levels.map(function (lvl, i) { return renderLevel(lvl, i); }).join('') +
      (bonus
        ? '<div class="cross-links-block"><h3>Bonus Quick Explainer</h3><ul class="video-links">' + bonus + '</ul></div>'
        : '') +
      (role.capstone
        ? '<div class="capstone-block"><h3>Role-Readiness Proof / Capstone</h3><p>' + escapeHtml(role.capstone) + '</p></div>'
        : '') +
      (role.rubric
        ? '<div class="rubric-block"><h3>Proof Rubric</h3>' + renderRubricBody(role.rubric) + '</div>'
        : '') +
      renderRelatedRoles(role);

    // Interview Prep used to render as a collapsed section stacked right
    // under the Mastery Track, which read as the same content repeated
    // twice. Roles with a matching track now get a "Learn the Role" /
    // "Prep for Interviews" tab switch instead, so a visitor sees one
    // track at a time; roles with no track render exactly as before.
    var track = INTERVIEW_TRACK_BY_ROLE[role.name];
    var bodyHtml;
    if (track) {
      bodyHtml =
        '<div class="role-tabs" role="tablist">' +
        '<button type="button" class="role-tab active" data-role-tab="mastery" role="tab" aria-selected="true">Learn the Role</button>' +
        '<button type="button" class="role-tab" data-role-tab="interview" role="tab" aria-selected="false">Prep for Interviews</button>' +
        '</div>' +
        '<div class="role-tab-panel" data-role-panel="mastery">' + masteryPanel + '</div>' +
        '<div class="role-tab-panel" data-role-panel="interview" hidden>' + renderInterviewTrackBody(track) + '</div>';
    } else {
      bodyHtml = masteryPanel;
    }

    return (
      '<div class="detail-card">' +
      '<h2>' + escapeHtml(role.name) + '</h2>' +
      renderShareBar('https://zuyini.com/academy/roles/' + slugify(role.name) + '/', role.name + ' | Zuyini Academy') +
      (role.benchmark ? '<p class="detail-benchmark">Benchmark: ' + escapeHtml(role.benchmark) + '</p>' : '') +
      bodyHtml +
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
      .filter(function (lvl) { return lvl.videos && lvl.videos.length; })
      .map(function (lvl, index) {
        return (
          '<div class="level-block" data-level-index="' + index + '">' +
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
      .map(function (t, tierIndex) {
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
          '<div class="tier-block" data-level-index="' + tierIndex + '">' +
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
        ? '<div class="rubric-block"><h3>Evidence Standard</h3>' + renderRubricBody(cert.evidence_standard) + '</div>'
        : '') +
      '</div>'
    );
  }

  function renderSkillLadderRung(rung) {
    var badgeClass = (rung.label || '').toLowerCase().replace(/[^a-z].*$/, '');
    var items = (rung.items || []).map(function (it) {
      return '<p class="competency-title">' + escapeHtml(it.title) + '</p>' +
        '<ul class="video-links">' + renderVideo(it.video) + '</ul>';
    }).join('');
    return (
      '<div class="skill-ladder-rung">' +
      '<span class="level-badge ' + escapeHtml(badgeClass) + '">' + escapeHtml(rung.label) + '</span>' +
      (rung.title ? '<p class="competency-title">' + escapeHtml(rung.title) + '</p>' : '') +
      (rung.body ? '<p class="skill-grid-body">' + escapeHtml(rung.body) + '</p>' : '') +
      items +
      '</div>'
    );
  }

  function renderSkillBlock(block) {
    if (block.type === 'grid') {
      return (
        '<div class="guide-block"><h3>' + escapeHtml(block.heading) + '</h3>' +
        (block.note ? '<p class="detail-description">' + escapeHtml(block.note) + '</p>' : '') +
        '<div class="skill-grid">' +
        (block.items || []).map(function (it) {
          return '<div class="skill-grid-item"><p class="skill-grid-title">' + escapeHtml(it.title) + '</p>' +
            '<p class="skill-grid-body">' + escapeHtml(it.body) + '</p></div>';
        }).join('') +
        '</div></div>'
      );
    }
    if (block.type === 'videos') {
      return (
        '<div class="guide-block"><h3>' + escapeHtml(block.heading) + '</h3>' +
        (block.note ? '<p class="detail-description">' + escapeHtml(block.note) + '</p>' : '') +
        '<div class="competency">' +
        (block.items || []).map(function (it) {
          var v = it.video || {};
          var channel = v.channel || '';
          if (it.note) channel = channel ? channel + ' &mdash; ' + escapeHtml(it.note) : escapeHtml(it.note);
          return '<p class="competency-title">' + escapeHtml(it.title) + '</p>' +
            '<ul class="video-links">' + renderVideo({ title: v.title, url: v.url, channel: channel }) + '</ul>';
        }).join('') +
        '</div></div>'
      );
    }
    if (block.type === 'labs') {
      return (
        '<div class="guide-block"><h3>' + escapeHtml(block.heading) + '</h3>' +
        '<ul class="guide-list">' +
        (block.items || []).map(function (it) {
          return '<li><strong>' + escapeHtml(it.title) + ':</strong> ' + escapeHtml(it.body) + '</li>';
        }).join('') +
        '</ul></div>'
      );
    }
    if (block.type === 'practice') {
      return '<div class="guide-block"><h3>' + escapeHtml(block.heading) + '</h3><p>' + escapeHtml(block.body) + '</p></div>';
    }
    return '';
  }

  function renderSkillTrackBody(track) {
    return (
      (track.tagline ? '<p class="detail-description">' + escapeHtml(track.tagline) + '</p>' : '') +
      (track.intro ? '<p class="detail-description">' + escapeHtml(track.intro) + '</p>' : '') +
      (track.benchmark ? '<p class="detail-benchmark">Benchmark: ' + escapeHtml(track.benchmark) + '</p>' : '') +
      (track.ladder && track.ladder.length
        ? '<div class="guide-block skill-ladder"><h3>Mastery Ladder</h3>' + track.ladder.map(renderSkillLadderRung).join('') + '</div>'
        : '') +
      (track.blocks || []).map(renderSkillBlock).join('') +
      (track.practiceBody
        ? '<div class="capstone-block"><h3>' + escapeHtml(track.practiceHeading || 'Hands-On Practice') + '</h3><p>' + escapeHtml(track.practiceBody) + '</p></div>'
        : '') +
      (track.rubric
        ? '<div class="rubric-block"><h3>' + escapeHtml(track.rubricHeading || 'Proof Rubric') + '</h3>' + renderRubricBody(track.rubric) + '</div>'
        : '')
    );
  }

  function renderSkillTrack(track) {
    return (
      '<div class="detail-card">' +
      '<h2>' + escapeHtml(track.name) + '</h2>' +
      renderShareBar('https://zuyini.com/academy/skills/' + slugify(track.name) + '/', track.name + ' | Zuyini Academy Skill Track') +
      renderSkillTrackBody(track) +
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
    interview: {
      label: 'interview prep tracks',
      data: INTERVIEW_TRACKS.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }),
      searchPlaceholder: 'Search interview tracks, e.g. Product Manager, Engineering...',
      emptyTitle: 'Choose an interview preparation track',
      emptyBody: 'Benchmarked role-based interview tracks: Basic → Intermediate → Advanced practice, direct mock-interview videos, a timed practice loop and a pass rubric.',
      render: renderInterviewTrack,
    },
    skills: {
      label: 'bootcamps & skill tracks',
      data: (typeof SKILL_TRACKS_DATA !== 'undefined' ? SKILL_TRACKS_DATA : []).slice().sort(function (a, b) { return a.name.localeCompare(b.name); }),
      searchPlaceholder: 'Search bootcamps & skill tracks, e.g. Spanish, Full-Stack, AI Mastery...',
      emptyTitle: 'Choose a bootcamp or skill track',
      emptyBody: 'Hands-on mastery routes outside the role catalog: video-first bootcamp certificates, languages, programming languages, AI mastery, UI & UX mastery, personal development and professional development.',
      render: renderSkillTrack,
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
    interview: document.getElementById('hero-stat-interview'),
    skills: document.getElementById('hero-stat-skills'),
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

  // Which catalogs get progress tracking, and -- for the ones with a real
  // Basic/Intermediate/Advanced-style tier structure -- what the tier
  // wrapper/badge/intro selectors are called in that catalog's markup.
  // Pathways and Skill Tracks have no tier concept (a flat course
  // sequence, or a mastery ladder that isn't marked up the same way), so
  // they get the quick-facts/CTA header but no tier blocks or "Recommended
  // after ..." hints -- just "Start with: X" / "Continue: Y".
  var TIER_CONFIG = {
    roles: { block: '.level-block', badge: '.level-badge', intro: '.level-intro', unit: 'levels' },
    interview: { block: '.level-block', badge: '.level-badge', intro: '.level-intro', unit: 'levels' },
    certificates: { block: '.tier-block', badge: '.tier-label', intro: null, unit: 'tiers' },
    courses: { block: '.level-block', badge: '.level-badge', intro: null, unit: 'levels' },
  };

  function attachMasteryTracking(mode, slug) {
    if (mode !== 'roles' && mode !== 'pathways' && mode !== 'certificates' && mode !== 'interview' && mode !== 'skills' && mode !== 'courses') return;
    var card = detailEl.querySelector('.detail-card');
    var h2 = card && card.querySelector('h2');
    if (!card || !h2) return;
    // Roles with a matching Interview Prep tab render a second, hidden
    // panel that reuses the same .level-block/.video-links markup -- scope
    // every query to the Mastery panel alone so its progress tracking
    // doesn't pick up the (separately tracked-nowhere) interview videos.
    var scopeEl = card.querySelector('[data-role-panel="mastery"]') || card;

    var items = Array.prototype.filter.call(
      scopeEl.querySelectorAll('.video-links li, .tier-bridges li, .course-sequence li, .tier-courses li'),
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

    // Every tier stays open and clickable -- an experienced learner can
    // jump straight to Advanced -- but a tier that follows an incomplete
    // one gets a non-blocking "Recommended after ..." hint rather than a
    // hard lock, so the site's most advanced content is never hidden.
    var tierConf = TIER_CONFIG[mode];
    var levelBlocks = tierConf ? Array.prototype.slice.call(scopeEl.querySelectorAll(tierConf.block)) : [];
    var itemLevelIndex = items.map(function (li) {
      var block = tierConf && li.closest && li.closest(tierConf.block);
      return block ? parseInt(block.getAttribute('data-level-index'), 10) : -1;
    });

    var badge = document.createElement('div');
    badge.className = 'mastery-badge';
    h2.insertAdjacentElement('afterend', badge);

    var progressHeader = buildQuickFacts();

    // Finds the specific lesson label for one trackable item: the
    // competency/skill-block title immediately before its <ul>/<ol> (not
    // just "the nearest .competency-title", since several video items can
    // share one wrapping .competency block), falling back to the link's
    // own visible text with any trailing " — Channel" suffix stripped.
    function itemDisplayLabel(li) {
      if (!li) return 'this lesson';
      var list = li.closest('ul, ol');
      var sib = list && list.previousElementSibling;
      while (sib) {
        if (sib.classList && sib.classList.contains('competency-title')) return sib.textContent;
        sib = sib.previousElementSibling;
      }
      var link = li.querySelector('a, button');
      if (!link) return 'this lesson';
      var spans = link.querySelectorAll('span');
      var raw = spans.length ? spans[spans.length - 1].textContent : link.textContent;
      raw = (raw.split('—')[0] || raw).trim();
      return raw || 'this lesson';
    }

    function buildQuickFacts() {
      var panel = document.createElement('div');
      panel.className = 'role-quickfacts';

      var factsRow = document.createElement('div');
      factsRow.className = 'role-quickfacts-row';
      var hasCapstone = !!scopeEl.querySelector('.capstone-block');
      var factTexts = [items.length + ' lesson' + (items.length === 1 ? '' : 's')];
      if (levelBlocks.length) factTexts.push(levelBlocks.length + ' ' + tierConf.unit);
      if (hasCapstone) factTexts.push('1 capstone project');
      factTexts.forEach(function (t) {
        var span = document.createElement('span');
        span.className = 'role-quickfact';
        span.textContent = t;
        factsRow.appendChild(span);
      });
      panel.appendChild(factsRow);

      var intros = (tierConf && tierConf.intro ? levelBlocks : [])
        .map(function (b) { var p = b.querySelector(tierConf.intro); return p ? p.textContent : ''; })
        .filter(Boolean);
      if (intros.length) {
        var ul = document.createElement('ul');
        ul.className = 'role-outcomes';
        intros.forEach(function (t) {
          var li = document.createElement('li');
          li.textContent = t;
          ul.appendChild(li);
        });
        panel.appendChild(ul);
      }

      var cta = document.createElement('button');
      cta.type = 'button';
      cta.className = 'role-cta';
      cta.addEventListener('click', function () {
        var target;
        if (state.filter(Boolean).length >= items.length) {
          target = scopeEl.querySelector('.capstone-block') || scopeEl.querySelector('.rubric-block');
        } else {
          var nextIndex = state.findIndex(function (v) { return !v; });
          target = nextIndex >= 0 ? items[nextIndex] : null;
        }
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      panel.appendChild(cta);

      badge.insertAdjacentElement('afterend', panel);
      return { cta: cta };
    }

    function updateCta() {
      var checkedCount = state.filter(Boolean).length;
      if (checkedCount >= items.length) {
        progressHeader.cta.textContent = scopeEl.querySelector('.capstone-block') ? 'Review your capstone' : 'All lessons complete';
        return;
      }
      var nextIndex = state.findIndex(function (v) { return !v; });
      if (checkedCount === 0 && levelBlocks.length) {
        var firstBadge = levelBlocks[0].querySelector(tierConf.badge);
        progressHeader.cta.textContent = 'Start ' + (firstBadge ? firstBadge.textContent : '') + ' → Lesson 1';
      } else if (checkedCount === 0) {
        progressHeader.cta.textContent = 'Start with: ' + itemDisplayLabel(items[0]);
      } else {
        progressHeader.cta.textContent = 'Continue: ' + itemDisplayLabel(items[nextIndex]);
      }
    }

    function computeLevelRecommendations() {
      if (!levelBlocks.length) return;
      var priorComplete = true;
      levelBlocks.forEach(function (block, levelIdx) {
        var indices = [];
        itemLevelIndex.forEach(function (li, i) { if (li === levelIdx) indices.push(i); });
        var checked = indices.filter(function (i) { return state[i]; }).length;
        var thisLevelComplete = indices.length === 0 || checked === indices.length;
        var recommended = levelIdx === 0 || priorComplete;

        var banner = block.querySelector('.level-lock-banner');
        if (!recommended && !banner) {
          banner = document.createElement('p');
          banner.className = 'level-lock-banner';
          var prevBadge = levelBlocks[levelIdx - 1].querySelector(tierConf.badge);
          var iconSpan = document.createElement('span');
          iconSpan.className = 'level-lock-icon';
          iconSpan.setAttribute('aria-hidden', 'true');
          iconSpan.textContent = '★';
          banner.appendChild(iconSpan);
          banner.appendChild(document.createTextNode(
            ' Recommended after ' + (prevBadge ? prevBadge.textContent : 'the previous tier') + ' — every lesson below is still open.'
          ));
          block.insertBefore(banner, block.firstChild);
        } else if (recommended && banner) {
          banner.remove();
        }
        priorComplete = priorComplete && thisLevelComplete;
      });
    }

    function refresh() {
      computeLevelRecommendations();
      updateMasteryBadge(badge, state.filter(Boolean).length, items.length);
      updateCta();
      items.forEach(function (li, i) {
        var cb = li.querySelector('.mastery-check');
        if (!cb) return;
        cb.disabled = !clickState[i];
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
    attachMasteryTracking('courses', slug);
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
    var tabBtn = e.target.closest('[data-role-tab]');
    if (tabBtn) {
      var tabsContainer = tabBtn.closest('.role-tabs');
      var card = tabBtn.closest('.detail-card');
      if (!tabsContainer || !card) return;
      var targetTab = tabBtn.getAttribute('data-role-tab');
      Array.prototype.forEach.call(tabsContainer.querySelectorAll('.role-tab'), function (b) {
        var active = b === tabBtn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      Array.prototype.forEach.call(card.querySelectorAll('.role-tab-panel'), function (p) {
        p.hidden = p.getAttribute('data-role-panel') !== targetTab;
      });
      return;
    }
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
    MODES.interview.data.forEach(function (t) {
      var compText = [];
      (t.levels || []).forEach(function (lvl) {
        (lvl.competencies || []).forEach(function (c) {
          compText.push(c.title, c.practice);
        });
      });
      index.push({
        type: 'interview',
        typeLabel: 'Interview Prep',
        slug: slugify(t.name),
        name: t.name,
        snippet: t.subtitle || t.benchmark || '',
        blob: [t.name, t.subtitle, t.benchmark, t.capstone, compText.join(' ')].join(' '),
      });
    });
    MODES.skills.data.forEach(function (t) {
      var blockText = (t.blocks || []).map(function (b) {
        return [b.heading, (b.items || []).map(function (it) { return it.title + ' ' + (it.body || ''); }).join(' ')].join(' ');
      }).join(' ');
      index.push({
        type: 'skills',
        typeLabel: 'Skill Track',
        slug: slugify(t.name),
        name: t.name,
        snippet: t.tagline || t.intro || '',
        blob: [t.name, t.tagline, t.intro, blockText].join(' '),
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
