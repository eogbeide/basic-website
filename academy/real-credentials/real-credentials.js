(function () {
  var searchInput = document.getElementById('rc-search');
  var providerSelect = document.getElementById('rc-filter-provider');
  var typeSelect = document.getElementById('rc-filter-type');
  var resetBtn = document.getElementById('rc-filter-reset');
  var emptyNote = document.getElementById('rc-filter-empty');
  if (!searchInput || !providerSelect || !typeSelect || !resetBtn || !emptyNote) return;

  var sections = Array.prototype.slice.call(document.querySelectorAll('.credentials-section[id]'));
  // Every section starts closed by default (a prior fix) -- remember that
  // so clearing an active filter restores the same closed state, instead
  // of leaving sections the filter force-opened stuck open.
  var naturalOpenState = {};
  sections.forEach(function (sec) { naturalOpenState[sec.id] = sec.hasAttribute('open'); });

  function normalize(s) {
    return (s || '').toLowerCase();
  }

  function applyFilters() {
    var q = normalize(searchInput.value.trim());
    var provider = providerSelect.value;
    var type = typeSelect.value;
    var active = !!q || provider !== 'all' || type !== 'all';

    resetBtn.hidden = !active;

    var anySectionVisible = false;

    sections.forEach(function (sec) {
      if (type !== 'all' && sec.id !== type) {
        sec.hidden = true;
        return;
      }
      sec.hidden = false;

      var cards = sec.querySelectorAll('.credential-card, .credential-link-pill, .stack-card');
      var sectionHasMatch = cards.length === 0; // sections with no filterable cards (shouldn't happen) stay visible

      cards.forEach(function (card) {
        var cardProvider = card.getAttribute('data-provider');
        var isStack = card.classList.contains('stack-card');
        var matchesProvider = provider === 'all' ||
          cardProvider === provider ||
          (isStack && normalize(card.getAttribute('data-path') || '').indexOf(normalize(provider)) !== -1);
        var matchesQuery = !q || normalize(card.textContent).indexOf(q) !== -1;
        var show = matchesProvider && matchesQuery;
        card.style.display = show ? '' : 'none';
        if (show) sectionHasMatch = true;
      });

      if (active) {
        if (sectionHasMatch) {
          sec.setAttribute('open', '');
          anySectionVisible = true;
        } else {
          sec.hidden = true;
        }
      } else {
        if (naturalOpenState[sec.id]) {
          sec.setAttribute('open', '');
        } else {
          sec.removeAttribute('open');
        }
        anySectionVisible = true;
      }
    });

    emptyNote.hidden = !active || anySectionVisible;
  }

  searchInput.addEventListener('input', applyFilters);
  providerSelect.addEventListener('change', applyFilters);
  typeSelect.addEventListener('change', applyFilters);
  resetBtn.addEventListener('click', function () {
    searchInput.value = '';
    providerSelect.value = 'all';
    typeSelect.value = 'all';
    applyFilters();
  });
})();
