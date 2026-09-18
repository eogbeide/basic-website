document.addEventListener('DOMContentLoaded', () => {
  const form            = document.getElementById('rsvp-form');
  const emailInput      = document.getElementById('email');
  const emailError      = document.getElementById('email-error');
  const attendanceError = document.getElementById('attendance-error');
  const confirmation    = document.getElementById('confirmation');
  const submitBtn       = form.querySelector('.submit-btn');
  const floatingLayer   = document.getElementById('floating-layer');

  const EMOJIS = ['😂', '🔥', '💀', '🤣', '👀', '✨', '🎉', '💅', '🫠', '😤', '🤡', '👾', '🎭', '🌊', '⚡'];

  // Spawn background floating emojis
  spawnFloatingEmojis();

  // Clear errors as user edits fields
  emailInput.addEventListener('input', () => clearError(emailInput, emailError));
  form.querySelectorAll('input[name="attendance"]').forEach(r =>
    r.addEventListener('change', () => { attendanceError.textContent = ''; })
  );

  form.addEventListener('submit', handleSubmit);

  // ── Submit handler ────────────────────────────────────────────────────────

  function handleSubmit(e) {
    e.preventDefault();

    const emailOk      = validateEmail();
    const attendanceOk = validateAttendance();
    if (!emailOk || !attendanceOk) return;

    const choice = form.querySelector('input[name="attendance"]:checked').value;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      form.style.display = 'none';
      showConfirmation(choice, emailInput.value.trim());
      if (choice === 'yes') launchConfetti();
    }, 1200);
  }

  // ── Validation ────────────────────────────────────────────────────────────

  function validateEmail() {
    const val   = emailInput.value.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    if (!valid) {
      setFieldError(emailInput, emailError, 'Please enter a valid email address');
      return false;
    }
    clearError(emailInput, emailError);
    return true;
  }

  function validateAttendance() {
    const checked = form.querySelector('input[name="attendance"]:checked');
    if (!checked) {
      attendanceError.textContent = 'Please let us know if you can make it';
      // Shake the radio group
      const group = form.querySelector('.radio-group');
      group.classList.remove('shake');
      void group.offsetWidth;
      group.classList.add('shake');
      return false;
    }
    attendanceError.textContent = '';
    return true;
  }

  function setFieldError(input, errorEl, message) {
    input.classList.remove('shake');
    void input.offsetWidth;
    input.classList.add('shake', 'input-error');
    errorEl.textContent = message;
  }

  function clearError(input, errorEl) {
    input.classList.remove('input-error', 'shake');
    errorEl.textContent = '';
  }

  // ── Button loading state ──────────────────────────────────────────────────

  function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.classList.toggle('loading', on);
  }

  // ── Confirmation message ──────────────────────────────────────────────────

  const MESSAGES = {
    yes: {
      icon: '🎉',
      heading: "You're on the list!",
      body: "Get your costume ready — this is going to be the most iconic night of the year. Check your inbox for details.",
      stateClass: 'yes-state',
    },
    maybe: {
      icon: '🤔',
      heading: "Maybe we'll see you there!",
      body: "We hope you can make it. Keep an eye on your inbox in case plans change!",
      stateClass: 'maybe-state',
    },
    no: {
      icon: '😢',
      heading: "We'll miss you!",
      body: "Sorry you can't join us — we'll send you the best GIFs from the night. Stay legendary.",
      stateClass: 'no-state',
    },
  };

  function showConfirmation(choice, email) {
    const msg = MESSAGES[choice] || MESSAGES.no;
    confirmation.className = `confirmation ${msg.stateClass} visible`;
    confirmation.innerHTML = `
      <span class="confirmation-icon">${msg.icon}</span>
      <h2>${msg.heading}</h2>
      <p>${msg.body}</p>
      <p style="margin-top:10px; font-size:13px; color:#8b7aa8;">
        Confirmation sent to <strong style="color:#c084fc">${escapeHtml(email)}</strong>
      </p>
    `;
  }

  // ── Confetti burst ────────────────────────────────────────────────────────

  const CONFETTI = ['🎉', '🔥', '💅', '😂', '✨', '🎭', '🌈', '👾', '💀', '🤩'];

  function launchConfetti() {
    for (let i = 0; i < 28; i++) {
      setTimeout(() => spawnPiece(CONFETTI[Math.floor(Math.random() * CONFETTI.length)]), i * 60);
    }
  }

  function spawnPiece(icon) {
    const el = document.createElement('span');
    el.textContent = icon;
    el.style.cssText = `
      position: fixed;
      top: 0;
      left: ${Math.random() * 100}vw;
      font-size: ${18 + Math.random() * 24}px;
      pointer-events: none;
      z-index: 9999;
      user-select: none;
      animation: confettiFall ${1.2 + Math.random() * 1.6}s linear both;
    `;
    document.body.appendChild(el);

    // Inject keyframes once
    if (!document.getElementById('confetti-style')) {
      const style = document.createElement('style');
      style.id = 'confetti-style';
      style.textContent = `
        @keyframes confettiFall {
          0%   { transform: translateY(-5vh) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(108vh) rotate(500deg); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    el.addEventListener('animationend', () => el.remove());
  }

  // ── Floating background emojis ────────────────────────────────────────────

  function spawnFloatingEmojis() {
    for (let i = 0; i < 14; i++) {
      const el = document.createElement('span');
      el.className = 'float-emoji';
      el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      el.style.cssText = `
        left: ${Math.random() * 100}%;
        font-size: ${18 + Math.random() * 20}px;
        opacity: ${0.15 + Math.random() * 0.3};
        animation-duration: ${8 + Math.random() * 12}s;
        animation-delay: ${-Math.random() * 12}s;
      `;
      floatingLayer.appendChild(el);
    }
  }

  // ── Utility ───────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }
});
