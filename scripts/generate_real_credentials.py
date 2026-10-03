import json
import os
import re
import html as htmllib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'real_credentials.json')))

# Public, widely-recognized brand accent colors (not trademarked logo
# artwork) used to give the provider wall a "logo wall" feel without
# reproducing anyone's actual logo graphic -- see README note in the
# conversation this was built from: using real logo image files on a
# non-affiliated page edges into implied-endorsement territory, a plain
# color-accented wordmark doesn't.
PROVIDER_COLORS = {
    'Google': '#4285F4',
    'Microsoft': '#00A4EF',
    'IBM': '#0F62FE',
    'HubSpot': '#FF7A59',
    'Harvard': '#A51C30',
    'Univ. Helsinki': '#107EB2',
    'AWS': '#FF9900',
    'Open University': '#002E5B',
    'HP Foundation': '#0096D6',
    'Kaggle': '#20BEFF',
    'Salesforce': '#00A1E0',
}

PROVIDER_NAMES = [p['name'] for p in d['providers']]


def esc(s):
    return htmllib.escape(s or '', quote=True)


def infer_provider(text):
    """Finds which known provider a group/card heading belongs to, so
    filter attributes can be added without hand-tagging every item in
    the JSON. Longest-name-first avoids 'IBM' matching inside some
    other provider's longer name, etc."""
    if not text:
        return None
    for name in sorted(PROVIDER_NAMES, key=len, reverse=True):
        if re.search(r'\b' + re.escape(name.split('.')[-1].strip()) + r'\b', text, re.I):
            return name
    return None


def render_item_card(it, provider):
    prov_attr = ' data-provider="' + esc(provider) + '"' if provider else ''
    return (
        '<div class="credential-card"' + prov_attr + '>'
        '<p class="credential-card-title">' + esc(it['title']) + '</p>'
        '<p class="credential-card-desc">' + esc(it['desc']) + '</p>'
        '<div class="credential-card-foot">'
        '<span class="credential-tag">' + esc(it['tag']) + '</span>'
        '<a class="credential-open" href="' + esc(it['url']) + '" target="_blank" rel="noopener noreferrer">Open &rarr;</a>'
        '</div>'
        '</div>'
    )


def render_group(g):
    provider = infer_provider(g['heading'])
    out = '<h3 class="credential-group-heading">' + esc(g['heading']) + '</h3>'
    if g.get('note'):
        out += '<p class="credential-group-note">' + esc(g['note']) + '</p>'
    out += '<div class="credential-grid">' + ''.join(render_item_card(it, provider) for it in g['items']) + '</div>'
    return out


def render_links_row(links):
    if not links:
        return ''
    out = '<div class="credential-links-row">'
    for lk in links:
        provider = infer_provider(lk['title'])
        prov_attr = ' data-provider="' + esc(provider) + '"' if provider else ''
        out += '<a class="credential-link-pill"' + prov_attr + ' href="' + esc(lk['url']) + '" target="_blank" rel="noopener noreferrer">' + esc(lk['title']) + ' &rarr;</a>'
    out += '</div>'
    return out


def render_section(s):
    out = '<details class="credentials-section" id="' + esc(s['id']) + '">'
    out += '<summary class="section-collapse-summary">'
    out += '<span class="section-label">' + esc(s['label']) + '</span>'
    out += '<h2>' + esc(s['title']) + '</h2>'
    out += '<span class="section-collapse-chevron" aria-hidden="true">&#9662;</span>'
    out += '</summary>'
    out += '<div class="section-collapse-body">'
    out += '<p class="credentials-section-subtitle">' + esc(s['subtitle']) + '</p>'
    if s.get('intro'):
        out += '<p class="credentials-section-intro">' + esc(s['intro']) + '</p>'

    for g in s.get('groups', []):
        out += render_group(g)

    if s.get('links'):
        out += render_links_row(s['links'])

    if s.get('groupsHeadingAfterLinks'):
        out += '<h3 class="credential-group-heading">' + esc(s['groupsHeadingAfterLinks']) + '</h3>'

    if s.get('cards'):
        out += '<div class="credential-grid">'
        for c in s['cards']:
            provider = infer_provider(c['heading'])
            prov_attr = ' data-provider="' + esc(provider) + '"' if provider else ''
            out += (
                '<div class="credential-card credential-card--wide"' + prov_attr + '>'
                '<p class="credential-card-title">' + esc(c['heading']) + '</p>'
                '<p class="credential-card-desc">' + esc(c['body']) + '</p>'
                '<div class="credential-card-foot">'
                '<a class="credential-open" href="' + esc(c['url']) + '" target="_blank" rel="noopener noreferrer">' + esc(c['linkTitle']) + ' &rarr;</a>'
                '</div>'
                '</div>'
            )
        out += '</div>'

    if s.get('stacks'):
        out += '<div class="stack-grid">'
        for st in s['stacks']:
            out += (
                '<div class="stack-card" data-path="' + esc(st['path']) + '">'
                '<span class="stack-tag">' + esc(st['tag']) + '</span>'
                '<p class="stack-title">' + esc(st['title']) + '</p>'
                '<p class="stack-path">' + esc(st['path']) + '</p>'
                '</div>'
            )
        out += '</div>'

    if s.get('auditStandard'):
        out += '<div class="audit-standard"><h3 class="credential-group-heading">How We Verify Every Listing</h3><ol class="audit-standard-list">'
        for a in s['auditStandard']:
            out += '<li>' + esc(a) + '</li>'
        out += '</ol></div>'

    if s.get('note'):
        out += '<p class="credential-footnote">' + esc(s['note']) + '</p>'

    out += '</div>'
    out += '</details>'
    return out


taxonomy_html = ''.join(
    '<div class="taxonomy-card">'
    '<p class="taxonomy-label">' + esc(t['label']) + '</p>'
    '<span class="taxonomy-tag">' + esc(t['tag']) + '</span>'
    '<p class="taxonomy-desc">' + esc(t['desc']) + '</p>'
    '</div>'
    for t in d['taxonomy']
)

# Wordmark wall: a styled-text "logo wall" using each provider's public
# brand accent color, not an actual logo image file (see PROVIDER_COLORS
# note above).
providers_html = ''.join(
    '<div class="provider-wordmark" style="--brand-color: ' + esc(PROVIDER_COLORS.get(p['name'], '#ffc629')) + '">'
    '<p class="provider-wordmark-name">' + esc(p['name']) + '</p>'
    '<span class="provider-wordmark-product">' + esc(p['product']) + '</span>'
    '</div>'
    for p in d['providers']
)

section_nav_html = ''.join(
    '<a href="#' + esc(s['id']) + '">' + esc(s['label']) + '</a>'
    for s in d['sections']
)

sections_html = ''.join(render_section(s) for s in d['sections'])

provider_filter_options = ''.join(
    '<option value="' + esc(p['name']) + '">' + esc(p['name']) + '</option>'
    for p in d['providers']
)

type_filter_options = ''.join(
    '<option value="' + esc(s['id']) + '">' + esc(s['label']) + '</option>'
    for s in d['sections']
)

page = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>REAL Provider-Issued Credentials | Zuyini Academy</title>
  <meta name="description" content="A verified directory of real, provider-issued credentials from Google, Microsoft, IBM, HubSpot, AWS, Salesforce, Harvard and more &mdash; free certifications, micro-credentials, badges and university certificates, mapped to Zuyini roles." />
  <link rel="canonical" href="https://zuyini.com/academy/real-credentials/" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="REAL Provider-Issued Credentials | Zuyini Academy" />
  <meta property="og:description" content="A verified directory of real, provider-issued credentials from Google, Microsoft, IBM, HubSpot, AWS, Salesforce, Harvard and more." />
  <meta property="og:image" content="https://zuyini.com/academy/og-image.png" />
  <meta property="og:url" content="https://zuyini.com/academy/real-credentials/" />
  <link rel="stylesheet" href="../academy.css" />
  <link rel="stylesheet" href="../../gate.css" />
  <link rel="stylesheet" href="real-credentials.css" />
</head>
<body>
  <header class="site-header">
    <a href="/index.html" class="logo">
      <span class="logo-mark">Z</span>
      <span>Zuyini Academy</span>
    </a>
    <nav class="nav-links">
      <a href="/academy/index.html">Academy</a>
      <a href="/health-sciences/index.html">Health Sciences</a>
      <a href="/newsletter/index.html">Newsletter</a>
      <a href="/index.html#about">About Manny</a>
    </nav>
  </header>

  <section class="academy-hero">
    <div class="hero-glow" aria-hidden="true"></div>
    <div class="hero-inner">
      <p class="section-label">Verified Directory &mdash; Updated ''' + esc(d['verifiedDate']) + '''</p>
      <h1>''' + esc(d['title']) + '''</h1>
      <p class="hero-description">''' + esc(d['subtitle']) + '''. We just help you find the free ones and explain exactly what you'd be earning.</p>
      <div class="inline-signup">
        <p class="inline-signup-heading">Get free access</p>
        <p class="inline-signup-pitch">Sign up with your name and email to unlock every video, course and mastery tracker across the Academy and Health Sciences Academy. No spam, unsubscribe anytime.</p>
        <form class="zuyini-inline-signup" novalidate>
          <div class="gate-field">
            <label for="rc-signup-name">Name</label>
            <input id="rc-signup-name" name="first_name" type="text" autocomplete="given-name" required />
          </div>
          <div class="gate-field">
            <label for="rc-signup-email">Email</label>
            <input id="rc-signup-email" name="email" type="email" autocomplete="email" required />
          </div>
          <button type="submit" class="gate-submit">Get Access</button>
          <p class="gate-error" hidden></p>
        </form>
        <p class="gate-success" hidden>You're in &mdash; every video, course and tracker is unlocked. Thanks for joining Zuyini!</p>
      </div>
    </div>
  </section>

  <main class="credentials-main">
    <section class="credentials-section credentials-intro">
      <div class="issuer-rule">
        <p class="issuer-rule-label">Who Actually Issues This</p>
        <p>''' + esc(d['issuerRule']) + '''</p>
      </div>

      <h2>Credential Taxonomy &mdash; Exactly as Each Provider Names It</h2>
      <div class="taxonomy-grid">''' + taxonomy_html + '''</div>

      <div class="audit-callout">
        <p class="audit-callout-label">Worth Knowing</p>
        <p>''' + esc(d['audit']) + '''</p>
      </div>

      <h2>Verified Providers</h2>
      <div class="provider-wall">''' + providers_html + '''</div>

      <div class="credentials-filter-bar">
        <div class="credentials-filter-field">
          <label for="rc-search">Search</label>
          <input id="rc-search" type="text" placeholder="e.g. Python, Google, AI agent..." autocomplete="off" />
        </div>
        <div class="credentials-filter-field">
          <label for="rc-filter-provider">Provider</label>
          <select id="rc-filter-provider">
            <option value="all">All Providers</option>
            ''' + provider_filter_options + '''
          </select>
        </div>
        <div class="credentials-filter-field">
          <label for="rc-filter-type">Type</label>
          <select id="rc-filter-type">
            <option value="all">All Types</option>
            ''' + type_filter_options + '''
          </select>
        </div>
        <button type="button" class="credentials-filter-reset" id="rc-filter-reset" hidden>Clear filters</button>
      </div>
      <p class="credentials-filter-empty" id="rc-filter-empty" hidden>No credentials match that search &mdash; try a different term, provider or type.</p>

      <nav class="credentials-section-nav" aria-label="Jump to section">''' + section_nav_html + '''</nav>
    </section>

''' + sections_html + '''
  </main>

  <footer>
    <div class="footer-links">
      <a href="/academy/index.html">Academy</a>
      <a href="/health-sciences/index.html">Health Sciences</a>
      <a href="/newsletter/index.html">Newsletter</a>
      <a href="/index.html">Zuyini Consulting</a>
      <a href="https://www.linkedin.com/in/emmanuelogbeide/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
      <a href="mailto:manny.ogbeide@gmail.com">Contact</a>
      <a href="/privacy.html">Privacy Policy</a>
    </div>
    <p>&copy; 2026 Zuyini Academy. Built by Manny Ogbeide.</p>
  </footer>

  <script src="../../gate.js"></script>
  <script src="real-credentials.js"></script>
</body>
</html>
'''

with open(ROOT + '/academy/real-credentials/index.html', 'w') as fh:
    fh.write(page)
print('written, length:', len(page))
