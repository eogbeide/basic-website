import json
import datetime
from xml.sax.saxutils import escape

import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://zuyini.com"
LASTMOD = datetime.date.today().isoformat()

academy_urls = json.load(open(f"{ROOT}/.static-academy-urls.json"))
hsa_urls = json.load(open(f"{ROOT}/.static-hsa-urls.json"))

top_level = [
    # "/" itself is excluded: it's a redirect to "/academy/" (see vercel.json),
    # not a real page -- listing a redirecting URL in the sitemap just tells
    # Google to crawl a dead end instead of the real destination, which is
    # already listed below.
    f"{BASE}/academy/",
    f"{BASE}/health-sciences/",
    f"{BASE}/newsletter/",
    f"{BASE}/academy/real-credentials/",
    f"{BASE}/privacy.html",
]

all_urls = top_level + academy_urls + hsa_urls

entries = "\n".join(
    f"  <url><loc>{escape(u)}</loc><lastmod>{LASTMOD}</lastmod></url>" for u in all_urls
)
sitemap = f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{entries}\n</urlset>\n'

with open(f"{ROOT}/sitemap.xml", "w") as f:
    f.write(sitemap)

robots = f"""User-agent: *
Allow: /

Sitemap: {BASE}/sitemap.xml
"""
with open(f"{ROOT}/robots.txt", "w") as f:
    f.write(robots)

print("total URLs in sitemap:", len(all_urls))
