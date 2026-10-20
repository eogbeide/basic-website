// Zuyini Academy <-> Zuyini App bridge.
// - Adds a "Zuyini App" link to the Academy header.
// - Links to the app carry this page's address, so the app can offer
//   "Back to Zuyini Academy".
// - Pages opened from the app (?from=app&return=...) show a
//   "Back to Zuyini App" button for the rest of the visit.
(function () {
  var APP = 'https://app.zuyini.com';
  var KEY = 'zuyini_return_app';
  var okReturn = function (u) {
    return /^https:\/\/app\.zuyini\.com(\/|$)/.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(u);
  };
  var q;
  try {
    q = new URLSearchParams(window.location.search);
    if (q.get('from') === 'app') {
      var r = q.get('return') || APP;
      if (okReturn(r)) sessionStorage.setItem(KEY, r);
    }
  } catch (e) {}

  function cleanHere() {
    var u = new URL(window.location.href);
    ['from', 'return', 'app'].forEach(function (k) { u.searchParams.delete(k); });
    u.hash = '';
    return u.toString();
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var back = null;
    try { back = sessionStorage.getItem(KEY); } catch (e) {}
    var inAppSheet = document.documentElement.classList.contains('zuyini-in-app');

    // Header link to the app (back to the same app screen when we came from it).
    var nav = document.querySelector('.site-header .nav-links');
    if (nav && !nav.querySelector('a[href^="' + APP + '"]')) {
      var a = document.createElement('a');
      a.href = back || APP;
      a.textContent = back ? '← Zuyini App' : 'Zuyini App';
      a.className = 'zuyini-app-link';
      nav.appendChild(a);
    }

    // Floating "Back to Zuyini App" button. The phone app's in-app browser has
    // its own Done button, so it isn't needed there.
    if (back && !inAppSheet && !document.getElementById('zuyini-back')) {
      var style = document.createElement('style');
      style.textContent =
        '#zuyini-back{position:fixed;left:16px;bottom:16px;z-index:2147483000;display:flex;align-items:center;gap:6px;' +
        'background:#1E3358;color:#fff;border-radius:999px;box-shadow:0 6px 20px rgba(15,23,42,.25);font:700 14px/1 system-ui,-apple-system,sans-serif}' +
        '#zuyini-back a{color:#fff;text-decoration:none;padding:12px 4px 12px 16px}' +
        '#zuyini-back button{background:none;border:0;color:rgba(255,255,255,.75);font:700 16px/1 system-ui;padding:12px 14px 12px 6px;cursor:pointer}' +
        '@media print{#zuyini-back{display:none}}';
      document.head.appendChild(style);
      var pill = document.createElement('div');
      pill.id = 'zuyini-back';
      pill.innerHTML = '<a href="#">← Back to Zuyini App</a><button type="button" aria-label="Hide">×</button>';
      pill.querySelector('a').href = back;
      pill.querySelector('button').addEventListener('click', function () {
        pill.remove();
        try { sessionStorage.removeItem(KEY); } catch (e) {}
      });
      document.body.appendChild(pill);
    }

    // Links into the app say where to come back to.
    document.addEventListener(
      'click',
      function (e) {
        var link = e.target && e.target.closest ? e.target.closest('a[href^="' + APP + '"]') : null;
        if (!link) return;
        try {
          var u = new URL(link.href);
          u.searchParams.set('from', 'academy');
          u.searchParams.set('return', cleanHere());
          link.href = u.toString();
        } catch (err) {}
      },
      true
    );
  });
})();
