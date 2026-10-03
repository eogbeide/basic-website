(function () {
  // --- Kit (ConvertKit) config -------------------------------------------
  // Fill these in once the Kit account exists: Settings -> Developer for
  // the API Key, and the numeric ID from the target form's URL/settings.
  var CONVERTKIT_API_KEY = 'glQonXzF8Kru7mjNUS9uWg';
  var CONVERTKIT_FORM_ID = '9959739';
  // -------------------------------------------------------------------------

  var STORAGE_KEY = 'zuyini_access_granted';

  function hasAccess() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false; // if storage is blocked, fail open rather than trap the visitor
    }
  }

  function grantAccess() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
      // ignore -- worst case they see the gate again next visit
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function truncate(str, n) {
    if (!str || str.length <= n) return str || '';
    return str.slice(0, n - 1).trim() + '…';
  }

  // `context` (optional) ties the ask to the specific thing the visitor
  // just tried to open -- e.g. a video title and the role/topic it's
  // part of -- instead of a generic pitch. Asking right after someone has
  // shown real intent (they clicked something they wanted) converts
  // better than asking before they've seen any value, so the headline
  // and pitch get sharper when we know what that was; falling back to
  // the generic copy when we don't (e.g. no context passed).
  function buildOverlay(context) {
    var headline = context && context.itemLabel ?
      'Unlock &ldquo;' + escapeHtml(truncate(context.itemLabel, 64)) + '&rdquo;' :
      'Get free access';
    var pitch = context && context.itemLabel ?
      'Sign up free (10 seconds, no card) to watch this now' +
      (context.parentLabel ? ' and unlock the rest of ' + escapeHtml(context.parentLabel) + '&rsquo;s path' : ' and unlock every other video and course in the Academy') +
      '. No spam, unsubscribe anytime.' :
      'Sign up free (10 seconds, no card) to unlock every video, course and mastery tracker in the Academy and Health Sciences Academy catalogs. No spam, unsubscribe anytime.';

    var overlay = document.createElement('div');
    overlay.id = 'signup-gate';
    overlay.innerHTML =
      '<div class="gate-card">' +
      '<button type="button" class="gate-close" aria-label="Close">&times;</button>' +
      '<span class="logo-mark">Z</span>' +
      '<h2>' + headline + '</h2>' +
      '<p class="gate-pitch">' + pitch + '</p>' +
      '<form id="gate-form" novalidate>' +
      '<div class="gate-field">' +
      '<label for="gate-name">Name</label>' +
      '<input id="gate-name" name="first_name" type="text" autocomplete="given-name" required />' +
      '</div>' +
      '<div class="gate-field">' +
      '<label for="gate-email">Email</label>' +
      '<input id="gate-email" name="email" type="email" autocomplete="email" required />' +
      '</div>' +
      '<button type="submit" class="gate-submit">Get Access</button>' +
      '<p class="gate-error" id="gate-error" hidden></p>' +
      '</form>' +
      '<p class="gate-fineprint">By continuing you agree to receive occasional emails from Zuyini. You can unsubscribe at any time.</p>' +
      '</div>';
    return overlay;
  }

  function showError(el, message) {
    el.textContent = message;
    el.hidden = false;
  }

  function subscribe(name, email) {
    var url = 'https://api.convertkit.com/v3/forms/' + CONVERTKIT_FORM_ID + '/subscribe';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: CONVERTKIT_API_KEY,
        email: email,
        first_name: name,
      }),
    }).then(function (res) {
      if (!res.ok) throw new Error('Signup failed (' + res.status + ')');
      return res.json();
    });
  }

  // Shared submit-handling for ANY signup form on the page -- the modal's
  // internal form and a static, always-visible inline form both use this,
  // so there is one signup code path (validation, the ConvertKit call,
  // granting access) rather than two copies to keep in sync. Looks fields
  // up by `name` (not `id`) so multiple form instances can coexist in the
  // DOM without id collisions.
  function attachSignupForm(form, opts) {
    opts = opts || {};
    // .gate-success sits as a sibling after the <form>, not inside it (so
    // it can replace the whole form visually rather than nest inside a
    // hidden element), so look for it in the wrapping container too.
    var scope = form.closest('.inline-signup') || form.parentElement || form;
    var errorEl = form.querySelector('.gate-error');
    var submitBtn = form.querySelector('button[type="submit"]');
    var successEl = scope.querySelector('.gate-success');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (errorEl) errorEl.hidden = true;

      var name = form.querySelector('[name="first_name"]').value.trim();
      var email = form.querySelector('[name="email"]').value.trim();

      if (!name) {
        if (errorEl) showError(errorEl, 'Please enter your name.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (errorEl) showError(errorEl, 'Please enter a valid email address.');
        return;
      }

      var originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Please wait...';

      subscribe(name, email)
        .then(function () {
          grantAccess();
          if (opts.onSuccess) {
            opts.onSuccess();
          } else {
            form.hidden = true;
            if (successEl) successEl.hidden = false;
          }
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
          if (errorEl) showError(errorEl, 'Something went wrong. Please try again in a moment.');
        });
    });
  }

  var activeOverlay = null;
  var pendingCallbacks = [];

  function closeOverlay() {
    if (!activeOverlay) return;
    document.body.style.overflow = '';
    activeOverlay.remove();
    activeOverlay = null;
    pendingCallbacks = [];
  }

  // Shows the signup modal. `onGranted` (optional) runs once access is
  // granted from THIS modal instance -- used so a gated click (e.g. opening
  // a video) can complete automatically right after signup instead of
  // making the visitor click twice. `context` (optional) is the {itemLabel,
  // parentLabel} passed through from requireAccess, used to make the ask
  // specific to what was just clicked instead of generic.
  function showGate(onGranted, context) {
    if (activeOverlay) {
      if (onGranted) pendingCallbacks.push(onGranted);
      return;
    }
    if (onGranted) pendingCallbacks.push(onGranted);

    document.body.style.overflow = 'hidden';
    var overlay = buildOverlay(context);
    document.body.appendChild(overlay);
    activeOverlay = overlay;

    var form = overlay.querySelector('#gate-form');
    var closeBtn = overlay.querySelector('.gate-close');

    closeBtn.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeOverlay();
    });

    attachSignupForm(form, {
      onSuccess: function () {
        var callbacks = pendingCallbacks;
        closeOverlay();
        callbacks.forEach(function (cb) {
          try { cb(); } catch (e) { /* ignore */ }
        });
      },
    });
  }

  // Public API used by academy.js / health-sciences.js to gate a specific
  // action (opening a video link, ticking a mastery checkbox) rather than
  // blocking the whole page on load. Browsing roles/topics/pathways stays
  // free; only "reviewing the content" itself prompts signup.
  window.ZuyiniGate = {
    hasAccess: hasAccess,
    // `context` (optional): {itemLabel, parentLabel} -- what the visitor
    // just tried to open, so the modal's ask can name it specifically
    // instead of a generic pitch.
    requireAccess: function (onGranted, context) {
      if (hasAccess()) {
        if (onGranted) onGranted();
        return true;
      }
      showGate(onGranted, context);
      return false;
    },
  };

  // Any static, always-visible signup form on the page (e.g. the landing
  // hero's "Get free access" block) gets the same submit handling as the
  // modal, with no per-page JS needed beyond loading gate.js. A visitor who
  // already has access never sees it -- there is nothing left to sign up
  // for -- and a crawler or text-only reader sees the real form markup
  // (name/email fields, a submit button) directly in the page source,
  // unlike the modal, which only exists in the DOM after a gated click.
  function wireStaticForms() {
    var forms = document.querySelectorAll('.zuyini-inline-signup');
    for (var i = 0; i < forms.length; i++) {
      var form = forms[i];
      var wrapper = form.closest('.inline-signup') || form;
      if (hasAccess()) {
        wrapper.hidden = true;
        continue;
      }
      attachSignupForm(form);
    }
  }

  // gate.js loads last in the document (same as academy.js/health-sciences.js),
  // so the static markup it wires up already exists -- no need to wait for
  // DOMContentLoaded.
  wireStaticForms();
})();
