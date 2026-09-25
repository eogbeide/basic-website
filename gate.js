(function () {
  // --- Kit (ConvertKit) config -------------------------------------------
  // Fill these in once the Kit account exists: Settings -> Developer for
  // the API Key, and the numeric ID from the target form's URL/settings.
  var CONVERTKIT_API_KEY = 'REPLACE_WITH_CONVERTKIT_API_KEY';
  var CONVERTKIT_FORM_ID = 'REPLACE_WITH_CONVERTKIT_FORM_ID';
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

  function buildOverlay() {
    var overlay = document.createElement('div');
    overlay.id = 'signup-gate';
    overlay.innerHTML =
      '<div class="gate-card">' +
      '<span class="logo-mark">Z</span>' +
      '<h2>Get free access</h2>' +
      '<p class="gate-pitch">Sign up with your name and email to unlock the full Academy and Health Sciences Academy catalogs, plus occasional updates from Zuyini. No spam, unsubscribe anytime.</p>' +
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

  function initGate() {
    if (hasAccess()) return;

    document.body.style.overflow = 'hidden';
    var overlay = buildOverlay();
    document.body.appendChild(overlay);

    var form = overlay.querySelector('#gate-form');
    var errorEl = overlay.querySelector('#gate-error');
    var submitBtn = overlay.querySelector('.gate-submit');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errorEl.hidden = true;

      var name = overlay.querySelector('#gate-name').value.trim();
      var email = overlay.querySelector('#gate-email').value.trim();

      if (!name) {
        showError(errorEl, 'Please enter your name.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError(errorEl, 'Please enter a valid email address.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Please wait...';

      subscribe(name, email)
        .then(function () {
          grantAccess();
          document.body.style.overflow = '';
          overlay.remove();
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Get Access';
          showError(errorEl, 'Something went wrong. Please try again in a moment.');
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGate);
  } else {
    initGate();
  }
})();
