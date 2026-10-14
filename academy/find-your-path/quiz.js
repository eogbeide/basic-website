(function () {
  var QUESTIONS = [
    {
      title: 'What&rsquo;s your background?',
      sub: 'Pick the closest fit. You can change it later.',
      key: 'background',
      options: [
        { value: 'engineering', title: 'Engineering or software', desc: 'You build or maintain systems' },
        { value: 'data', title: 'Data or analytics', desc: 'Reporting, BI, SQL, modeling' },
        { value: 'finance', title: 'Finance or accounting', desc: 'Planning, close, controllership' },
        { value: 'revenue', title: 'Sales, marketing, or customer success', desc: 'Revenue and customer-facing roles' },
        { value: 'operations', title: 'Operations or supply chain', desc: 'Process, logistics, quality' },
        { value: 'new', title: 'New to tech', desc: 'Changing careers or just starting' },
      ],
    },
    {
      title: 'What do you want to get out of AI?',
      sub: 'Pick what pulls you in most &mdash; this shapes which role we match you to.',
      key: 'interest',
      options: [
        { value: 'build', title: 'Build and ship things', desc: 'Hands-on, technical work' },
        { value: 'analyze', title: 'Analyze and decide with data', desc: 'Reporting, modeling, insight' },
        { value: 'lead', title: 'Lead and manage change', desc: 'Strategy, people, adoption' },
        { value: 'sell', title: 'Sell, support or grow revenue', desc: 'Customer and revenue-facing' },
      ],
    },
    {
      title: 'How much experience do you have?',
      sub: 'This just tunes how we frame your path &mdash; the lessons are the same either way.',
      key: 'experience',
      options: [
        { value: 'starting', title: 'Just starting out', desc: 'New to this area' },
        { value: 'some', title: 'A few years in', desc: 'Comfortable with the basics' },
        { value: 'senior', title: 'Senior, or leading others', desc: 'Ready to go deep fast' },
      ],
    },
  ];

  // background -> interest -> { slug, name, lessons, tag }
  var MATCHES = {
    engineering: {
      build: { slug: 'full-stack-engineer', name: 'Full-Stack Engineer', lessons: 13, tag: 'Software Engineering' },
      analyze: { slug: 'data-engineer', name: 'Data Engineer', lessons: 13, tag: 'Data & ML' },
      lead: { slug: 'engineering-manager', name: 'Engineering Manager', lessons: 13, tag: 'Leadership' },
      sell: { slug: 'solutions-engineer', name: 'Solutions Engineer', lessons: 13, tag: 'Revenue & GTM' },
    },
    data: {
      build: { slug: 'data-engineer', name: 'Data Engineer', lessons: 13, tag: 'Data & ML' },
      analyze: { slug: 'data-scientist', name: 'Data Scientist', lessons: 13, tag: 'Data & ML' },
      lead: { slug: 'data-governance-lead', name: 'Data Governance Lead', lessons: 13, tag: 'Data & ML' },
      sell: { slug: 'business-intelligence-engineer', name: 'Business Intelligence Engineer', lessons: 13, tag: 'Data & ML' },
    },
    finance: {
      build: { slug: 'finance-ai-consultant', name: 'Finance AI Consultant', lessons: 13, tag: 'Finance & AI' },
      analyze: { slug: 'financial-analyst-fp-a-analyst', name: 'Financial Analyst / FP&amp;A Analyst', lessons: 13, tag: 'Finance & AI' },
      lead: { slug: 'financial-controller-comptroller-cfo', name: 'Financial Controller / Comptroller / CFO', lessons: 13, tag: 'Finance & AI' },
      sell: { slug: 'finance-ai-consultant', name: 'Finance AI Consultant', lessons: 13, tag: 'Finance & AI' },
    },
    revenue: {
      build: { slug: 'ai-solutions-engineer', name: 'AI Solutions Engineer', lessons: 13, tag: 'Revenue & GTM' },
      analyze: { slug: 'product-marketing-manager', name: 'Product Marketing Manager', lessons: 13, tag: 'Revenue & GTM' },
      lead: { slug: 'marketing-director', name: 'Marketing Director', lessons: 13, tag: 'Revenue & GTM' },
      sell: { slug: 'customer-success-manager', name: 'Customer Success Manager', lessons: 13, tag: 'Revenue & GTM' },
    },
    operations: {
      build: { slug: 'supply-chain-logistics-manager', name: 'Supply Chain &amp; Logistics Manager', lessons: 13, tag: 'Business Management' },
      analyze: { slug: 'business-analyst-business-systems-analyst', name: 'Business Analyst / Business Systems Analyst', lessons: 13, tag: 'Business Management' },
      lead: { slug: 'operations-consultant', name: 'Operations Consultant', lessons: 13, tag: 'Leadership' },
      sell: { slug: 'revenue-operations-manager', name: 'Revenue Operations Manager', lessons: 13, tag: 'Revenue & GTM' },
    },
    new: {
      build: { slug: 'ai-engineer', name: 'AI Engineer', lessons: 14, tag: 'AI & Agents' },
      analyze: { slug: 'data-analyst', name: 'Data Analyst', lessons: 13, tag: 'Data & ML' },
      lead: { slug: 'digital-product-manager', name: 'Digital Product Manager', lessons: 13, tag: 'Leadership' },
      sell: { slug: 'customer-success-manager', name: 'Customer Success Manager', lessons: 13, tag: 'Revenue & GTM' },
    },
  };

  var EXPERIENCE_WHY = {
    starting: 'Since you&rsquo;re just starting out, Basic opens with the fundamentals before any AI tooling.',
    some: 'With a few years already under your belt, you can move through Basic quickly and spend most of your time in Intermediate and Advanced.',
    senior: 'Since you&rsquo;re already experienced, skim Basic and go straight to the AI-native, Advanced-level work.',
  };

  var state = { step: 0, answers: {} };

  var stepLabel = document.getElementById('quiz-step-label');
  var progressFill = document.getElementById('quiz-progress-fill');
  var questionView = document.getElementById('quiz-question-view');
  var resultView = document.getElementById('quiz-result-view');
  var questionTitle = document.getElementById('quiz-question-title');
  var questionSub = document.getElementById('quiz-question-sub');
  var optionsEl = document.getElementById('quiz-options');
  var backBtn = document.getElementById('quiz-back');
  var nextBtn = document.getElementById('quiz-next');
  var restartBtn = document.getElementById('quiz-restart');

  function renderQuestion() {
    var q = QUESTIONS[state.step];
    stepLabel.textContent = 'Question ' + (state.step + 1) + ' of ' + QUESTIONS.length;
    progressFill.style.width = (((state.step + 1) / QUESTIONS.length) * 100) + '%';
    questionTitle.innerHTML = q.title;
    questionSub.innerHTML = q.sub;
    var selected = state.answers[q.key];
    optionsEl.innerHTML = q.options.map(function (opt) {
      var isSelected = selected === opt.value;
      return (
        '<button type="button" class="quiz-option' + (isSelected ? ' is-selected' : '') + '" data-value="' + opt.value + '" role="radio" aria-checked="' + (isSelected ? 'true' : 'false') + '">' +
        '<span class="quiz-option-radio" aria-hidden="true"></span>' +
        '<span><span class="quiz-option-title">' + opt.title + '</span><span class="quiz-option-desc">' + opt.desc + '</span></span>' +
        '</button>'
      );
    }).join('');
    backBtn.disabled = state.step === 0;
    backBtn.style.visibility = state.step === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = state.step === QUESTIONS.length - 1 ? 'See my path' : 'Next';
    nextBtn.disabled = !selected;
  }

  function renderResult() {
    var bg = state.answers.background;
    var interest = state.answers.interest;
    var exp = state.answers.experience;
    var match = (MATCHES[bg] && MATCHES[bg][interest]) || MATCHES.new.build;

    document.getElementById('quiz-result-category').innerHTML = match.tag;
    document.getElementById('quiz-result-role-title').innerHTML = match.name;
    document.getElementById('quiz-result-meta').textContent = match.lessons + ' video lessons · 3 levels · 1 capstone project';
    document.getElementById('quiz-result-why').innerHTML = EXPERIENCE_WHY[exp] || '';
    document.getElementById('quiz-result-link').href = '/academy/roles/' + match.slug + '/';

    questionView.hidden = true;
    resultView.hidden = false;
  }

  optionsEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.quiz-option');
    if (!btn) return;
    var q = QUESTIONS[state.step];
    state.answers[q.key] = btn.getAttribute('data-value');
    renderQuestion();
  });

  nextBtn.addEventListener('click', function () {
    if (nextBtn.disabled) return;
    if (state.step === QUESTIONS.length - 1) {
      renderResult();
      return;
    }
    state.step += 1;
    renderQuestion();
  });

  backBtn.addEventListener('click', function () {
    if (state.step === 0) return;
    state.step -= 1;
    renderQuestion();
  });

  restartBtn.addEventListener('click', function () {
    state = { step: 0, answers: {} };
    resultView.hidden = true;
    questionView.hidden = false;
    renderQuestion();
  });

  renderQuestion();
})();
