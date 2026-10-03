import json
import os
import html as htmllib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'real_credentials.json')))


def esc(s):
    return htmllib.escape(s or '', quote=True)


def render_item_card(it):
    return (
        '<div class="credential-card">'
        '<p class="credential-card-title">' + esc(it['title']) + '</p>'
        '<p class="credential-card-desc">' + esc(it['desc']) + '</p>'
        '<div class="credential-card-foot">'
        '<span class="credential-tag">' + esc(it['tag']) + '</span>'
        '<a class="credential-open" href="' + esc(it['url']) + '" target="_blank" rel="noopener noreferrer">Open &rarr;</a>'
        '</div>'
        '</div>'
    )


def render_group(g):
    out = '<h3 class="credential-group-heading">' + esc(g['heading']) + '</h3>'
    if g.get('note'):
        out += '<p class="credential-group-note">' + esc(g['note']) + '</p>'
    out += '<div class="credential-grid">' + ''.join(render_item_card(it) for it in g['items']) + '</div>'
    return out


def render_links_row(links):
    if not links:
        return ''
    out = '<div class="credential-links-row">'
    for lk in links:
        out += '<a class="credential-link-pill" href="' + esc(lk['url']) + '" target="_blank" rel="noopener noreferrer">' + esc(lk['title']) + ' &rarr;</a>'
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
            out += (
                '<div class="credential-card credential-card--wide">'
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
                '<div class="stack-card">'
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

providers_html = ''.join(
    '<div class="provider-chip"><strong>' + esc(p['name']) + '</strong><span>' + esc(p['product']) + '</span></div>'
    for p in d['providers']
)

section_nav_html = ''.join(
    '<a href="#' + esc(s['id']) + '">' + esc(s['label']) + '</a>'
    for s in d['sections']
)

sections_html = ''.join(render_section(s) for s in d['sections'])

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
      <p class="hero-description">''' + esc(d['subtitle']) + ''' &mdash; every credential here is awarded by the named provider under that provider's own rules. Zuyini curates, verifies and maps the opportunity; it never re-labels its own certificates as a provider's credential.</p>
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
        <p class="issuer-rule-label">Issuer Rule</p>
        <p>''' + esc(d['issuerRule']) + '''</p>
      </div>

      <h2>Credential Taxonomy &mdash; Named What Each Provider Actually Calls It</h2>
      <div class="taxonomy-grid">''' + taxonomy_html + '''</div>

      <div class="audit-callout">
        <p class="audit-callout-label">Audit Note</p>
        <p>''' + esc(d['audit']) + '''</p>
      </div>

      <h2>Providers Verified So Far</h2>
      <div class="provider-grid">''' + providers_html + '''</div>

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
</body>
</html>
'''

with open(ROOT + '/academy/real-credentials/index.html', 'w') as fh:
    fh.write(page)
print('written, length:', len(page))
