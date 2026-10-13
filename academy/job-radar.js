// Zuyini Job Radar signup: collects a subscriber's role/location/frequency
// preferences and submits them as ConvertKit (Kit) custom fields on the
// same public form gate.js already uses, via the same public, client-safe
// v3 "API Key" (not the account's v4 secret -- that one only ever runs
// server-side, in scripts/build_job_radar_digest.py via a GitHub Actions
// secret, never in this file). The actual weekly digest is compiled and
// sent by that server-side script; this file only ever writes preferences.
(function () {
  var CONVERTKIT_API_KEY = 'glQonXzF8Kru7mjNUS9uWg';
  var CONVERTKIT_FORM_ID = '9959739';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function populateRoleOptions(select) {
    if (typeof ROLES_DATA === 'undefined' || !select) return;
    var names = ROLES_DATA.map(function (r) { return r.name; }).sort();
    var options = names.map(function (n) {
      return '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>';
    }).join('');
    select.innerHTML = '<option value="">Choose a role&hellip;</option>' + options;
  }

  function initJobRadarForm() {
    var form = document.getElementById('job-radar-form');
    if (!form) return;

    populateRoleOptions(document.getElementById('job-radar-role'));

    var remoteCheckbox = document.getElementById('job-radar-remote');
    var locationInput = document.getElementById('job-radar-location');
    function syncLocationDisabled() {
      if (!remoteCheckbox || !locationInput) return;
      locationInput.disabled = remoteCheckbox.checked;
      if (remoteCheckbox.checked) locationInput.value = '';
    }
    if (remoteCheckbox) {
      remoteCheckbox.addEventListener('change', syncLocationDisabled);
      syncLocationDisabled();
    }

    var statusEl = document.getElementById('job-radar-status');
    var submitBtn = form.querySelector('.job-radar-submit');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Honeypot: real visitors never check this hidden checkbox.
      if (form.botcheck && form.botcheck.checked) return;

      var name = form.querySelector('[name="first_name"]').value.trim();
      var email = form.querySelector('[name="email"]').value.trim();
      var role = document.getElementById('job-radar-role').value;
      var frequency = document.getElementById('job-radar-frequency').value;
      var remote = remoteCheckbox && remoteCheckbox.checked;
      var location = remote ? 'Remote' : (locationInput ? locationInput.value.trim() : '');

      if (statusEl) { statusEl.hidden = true; statusEl.className = 'job-radar-status'; }

      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !role || !frequency || (!remote && !location)) {
        if (statusEl) {
          statusEl.textContent = 'Please fill in your name, email, a role, a location (or Remote), and how often you want updates.';
          statusEl.className = 'job-radar-status job-radar-status-error';
          statusEl.hidden = false;
        }
        return;
      }

      var originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing up...';

      fetch('https://api.convertkit.com/v3/forms/' + CONVERTKIT_FORM_ID + '/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: CONVERTKIT_API_KEY,
          email: email,
          first_name: name,
          fields: {
            job_radar_role: role,
            job_radar_location: location,
            job_radar_frequency: frequency,
          },
        }),
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Signup failed (' + res.status + ')');
          return res.json();
        })
        .then(function () {
          form.reset();
          syncLocationDisabled();
          if (statusEl) {
            statusEl.textContent = 'You&rsquo;re set. Your first ' + frequency.toLowerCase() + ' Job Radar digest for ' + role + ' lands in your inbox soon.';
            statusEl.innerHTML = statusEl.textContent;
            statusEl.className = 'job-radar-status job-radar-status-success';
            statusEl.hidden = false;
          }
        })
        .catch(function () {
          if (statusEl) {
            statusEl.textContent = 'Something went wrong. Please try again in a moment.';
            statusEl.className = 'job-radar-status job-radar-status-error';
            statusEl.hidden = false;
          }
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        });
    });
  }

  initJobRadarForm();
})();
