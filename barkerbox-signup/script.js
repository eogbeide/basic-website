document.addEventListener('DOMContentLoaded', () => {
  const form      = document.querySelector('.signup-form');
  const nameInput = document.getElementById('name');
  const emailInput= document.getElementById('email');
  const btn       = document.querySelector('.cta-btn');
  const card      = document.querySelector('.signup-card');

  animateCounter();

  // Personalise button text as the user types their name
  nameInput.addEventListener('input', updateButtonText);

  // Validate on blur only when the field has content (avoid nagging empty fields)
  nameInput.addEventListener('blur',  () => { if (nameInput.value.trim())  validateName(); });
  emailInput.addEventListener('blur', () => { if (emailInput.value.trim()) validateEmail(); });

  // Clear error styling as soon as the user starts fixing the field
  nameInput.addEventListener('input',  () => clearError(nameInput));
  emailInput.addEventListener('input', () => clearError(emailInput));

  form.addEventListener('submit', handleSubmit);

  // ── Core handlers ──────────────────────────────────────────────────────────

  function handleSubmit(e) {
    e.preventDefault();
    const nameOk  = validateName();
    const emailOk = validateEmail();
    if (!nameOk || !emailOk) return;

    setLoading(true);
    // Simulate async network request
    setTimeout(() => {
      setLoading(false);
      showSuccess(nameInput.value.trim().split(' ')[0]);
      launchConfetti();
    }, 1500);
  }

  function updateButtonText() {
    const first = nameInput.value.trim().split(' ')[0];
    btn.innerHTML = first.length > 1
      ? `Claim ${escapeHtml(first)}'s 15% Off &rarr;`
      : 'Claim My 15% Off &rarr;';
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  function validateName() {
    if (nameInput.value.trim().length < 2) {
      shakeField(nameInput, 'Please enter your name');
      return false;
    }
    clearError(nameInput);
    return true;
  }

  function validateEmail() {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());
    if (!valid) {
      shakeField(emailInput, 'Please enter a valid email address');
      return false;
    }
    clearError(emailInput);
    return true;
  }

  function shakeField(input, message) {
    // Re-trigger animation even if already applied
    input.classList.remove('shake');
    void input.offsetWidth;
    input.classList.add('shake', 'input-error');

    let err = input.nextElementSibling;
    if (!err || !err.classList.contains('field-error')) {
      err = document.createElement('p');
      err.className = 'field-error';
      input.after(err);
    }
    err.textContent = message;
  }

  function clearError(input) {
    input.classList.remove('input-error', 'shake');
    const err = input.nextElementSibling;
    if (err && err.classList.contains('field-error')) err.remove();
  }

  // ── Button states ──────────────────────────────────────────────────────────

  function setLoading(on) {
    btn.disabled = on;
    btn.innerHTML = on
      ? '<span class="btn-spinner"></span>Sending&hellip;'
      : 'Claim My 15% Off &rarr;';
  }

  // ── Success screen ─────────────────────────────────────────────────────────

  function showSuccess(firstName) {
    const name = escapeHtml(firstName || 'friend');
    card.innerHTML = `
      <div class="success-state">
        <div class="success-icon">🐾</div>
        <h2>You're in, ${name}!</h2>
        <p class="success-msg">
          Your <strong>15% off</strong> code is on its way to your inbox.
          Get ready for some seriously happy tail wags.
        </p>
        <p class="success-sub">We can't wait to spoil your pup. 🐶</p>
      </div>
    `;
  }

  // ── Confetti ───────────────────────────────────────────────────────────────

  const ICONS = ['🐾', '🦴', '🐶', '🎁', '⭐', '🏅'];

  function launchConfetti() {
    for (let i = 0; i < 24; i++) {
      setTimeout(() => spawnPiece(ICONS[Math.floor(Math.random() * ICONS.length)]), i * 65);
    }
  }

  function spawnPiece(icon) {
    const el = document.createElement('span');
    el.className = 'confetti-piece';
    el.textContent = icon;
    el.style.left            = Math.random() * 100 + 'vw';
    el.style.fontSize        = (14 + Math.random() * 22) + 'px';
    el.style.animationDuration = (1.2 + Math.random() * 1.8) + 's';
    el.style.animationDelay  = '0s';
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  // ── Social proof counter ───────────────────────────────────────────────────

  function animateCounter() {
    const el = document.querySelector('.social-proof');
    if (!el) return;
    const target   = 50000;
    const duration = 1600;
    const t0       = performance.now();

    const tick = (now) => {
      const p     = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      el.textContent = `⭐ Join ${Math.floor(eased * target).toLocaleString()}+ happy dog owners`;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }
});
