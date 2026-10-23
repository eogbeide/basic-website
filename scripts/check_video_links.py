"""Weekly check that every YouTube video the Academy links to still exists.

Asks YouTube's public oEmbed endpoint about each video ID in the live data
and pages (backup folders are skipped). 401 means the owner turned off
embedding; the video still plays on YouTube, and the Academy links out, so
that's fine. 400/403/404 mean the video is malformed, private or deleted.
Exits 1 if any are, so the workflow fails and GitHub emails the owner.
"""
import re, subprocess, sys, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

ID = re.compile(r"(?:youtube\.com/(?:watch\?v=|embed/)|youtu\.be/)([A-Za-z0-9_-]{11})")
files = [f for f in subprocess.run(["git", "ls-files", "academy", "index.html", "support.html"], capture_output=True, text=True).stdout.split()
         if "/backup_" not in f and f.endswith((".html", ".js", ".json"))]
where = {}
for f in files:
    try:
        text = open(f, encoding="utf-8").read()
    except (UnicodeDecodeError, FileNotFoundError):
        continue
    for vid in set(ID.findall(text)):
        where.setdefault(vid, []).append(f)

def status(vid):
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json"
    for _ in range(3):
        try:
            with urllib.request.urlopen(url, timeout=20) as r:
                return vid, r.status
        except urllib.error.HTTPError as e:
            if e.code in (400, 401, 403, 404):
                return vid, e.code
        except Exception:
            pass
    return vid, None  # unreachable: not counted

with ThreadPoolExecutor(16) as pool:
    results = list(pool.map(status, sorted(where)))
dead = [(v, s) for v, s in results if s in (400, 403, 404)]
print(f"{len(results)} videos checked, {len(dead)} dead.")
for v, s in dead:
    kind = {400: "malformed ID", 403: "private", 404: "deleted"}[s]
    print(f"  {v} ({kind}) in {', '.join(sorted(where[v])[:4])}")
sys.exit(1 if dead else 0)
