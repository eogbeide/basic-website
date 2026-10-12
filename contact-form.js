// Submits the contact form via fetch so visitors get an inline success/
// error message instead of leaving the page. If JS fails to load or
// run, the form's own action/method still POST it directly to Web3Forms
// as a plain page submission, so it keeps working either way.
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;

  var status = document.getElementById('contact-form-status');
  var submitBtn = form.querySelector('.contact-submit');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Honeypot: real visitors never check this hidden checkbox; bots that
    // blindly fill every field do, so silently drop the submission.
    if (form.botcheck && form.botcheck.checked) return;

    status.textContent = '';
    status.className = 'contact-form-status';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    fetch(form.action, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success) {
          form.reset();
          status.textContent = "Thanks! Your message is on its way -- I'll get back to you soon.";
          status.className = 'contact-form-status contact-form-status-success';
        } else {
          status.textContent = data.message || 'Something went wrong. Please try again.';
          status.className = 'contact-form-status contact-form-status-error';
        }
      })
      .catch(function () {
        status.textContent = 'Something went wrong sending that. Please try again or email me directly.';
        status.className = 'contact-form-status contact-form-status-error';
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
      });
  });
})();
