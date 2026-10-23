"""Weekly check that every YouTube video the Academy links to still exists.

Asks YouTube's public oEmbed endpoint about each video ID in the live data
and pages (backup folders are skipped). 401 means the owner turned off
embedding; the video still plays on YouTube, and the Academy links out, so
that's fine. 400/403/404 mean the video is malformed, private or deleted.
Exits 1 if any are, so the workflow fails and GitHub emails the owner.

It also lists videos that look like the wrong video for their lesson, for
a person to review (these don't fail the check): the real title is in a
non-Latin script while the lesson's isn't (a different language), or the
lesson's title and channel share no words with the real ones. Pairs a
person has reviewed as fine are listed in academy/data/video-review-ok.json
and skipped; add to it when the check flags a lesson that's actually right.
"""
import json, re, subprocess, sys, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

ID = re.compile(r"(?:youtube\.com/(?:watch\?v=|embed/)|youtu\.be/)([A-Za-z0-9_-]{11})")
files = [f for f in subprocess.run(["git", "ls-files", "academy", "index.html", "support.html"], capture_output=True, text=True).stdout.split()
         if "/backup_" not in f and f.endswith((".html", ".js", ".json"))]
where = {}
labels = {}  # video ID -> (lesson title, channel) as the Academy shows it
OBJ = re.compile(r"\{[^{}]*\}")
FIELD = lambda k, o: (re.search(r'"%s"\s*:\s*"((?:[^"\\]|\\.)*)"' % k, o) or [None, ""])[1]
for f in files:
    try:
        text = open(f, encoding="utf-8").read()
    except (UnicodeDecodeError, FileNotFoundError):
        continue
    for vid in set(ID.findall(text)):
        where.setdefault(vid, []).append(f)
    if f == "academy/data/data.js":
        for o in OBJ.findall(text):
            m = ID.search(o)
            if m and FIELD("title", o):
                labels.setdefault(m.group(1), set()).add((FIELD("title", o), FIELD("channel", o)))
try:
    REVIEWED = {(p["id"], p["title"]) for p in json.load(open("academy/data/video-review-ok.json", encoding="utf-8"))["pairs"]}
except FileNotFoundError:
    REVIEWED = set()

def status(vid):
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json"
    for _ in range(3):
        try:
            with urllib.request.urlopen(url, timeout=20) as r:
                return vid, r.status, json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (400, 401, 403, 404):
                return vid, e.code, None
        except Exception:
            pass
    return vid, None, None  # unreachable: not counted

STOP = set("a an and the of to in for on with how what why your you is are from by at it its this that into vs video lecture course full part intro introduction tutorial explained guide basics minutes min hour hours 2024 2025 2026".split())
def words(t):
    return {w for w in re.findall(r"[a-z0-9]+", t.lower().replace("&amp;", " ")) if len(w) > 1 and w not in STOP}
NON_LATIN = re.compile(r"[\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff\u0900-\u0dff\u0e00-\u0e7f\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]")

def mismatches(vid, info):
    """Each lesson using this video whose title and channel look unrelated to it."""
    if not info:
        return []
    real, author = info.get("title", ""), info.get("author_name", "")
    out = []
    for title, channel in sorted(labels.get(vid, ())):
        if (vid, title) in REVIEWED:
            continue
        if NON_LATIN.search(real) and not NON_LATIN.search(title):
            out.append((title, channel, "different language"))
        elif not (words(title + " " + channel) & words(real + " " + author)):
            out.append((title, channel, "no words in common"))
    return out

with ThreadPoolExecutor(16) as pool:
    results = list(pool.map(status, sorted(where)))
dead = [(v, s) for v, s, _ in results if s in (400, 403, 404)]
review = [(v, t, c, why, info) for v, s, info in results if s == 200 for t, c, why in mismatches(v, info)]
print(f"{len(results)} videos checked, {len(dead)} dead, {len(review)} to review.")
for v, s in dead:
    kind = {400: "malformed ID", 403: "private", 404: "deleted"}[s]
    print(f"  DEAD {v} ({kind}) in {', '.join(sorted(where[v])[:4])}")
if review:
    print("\nPossibly the wrong video for the lesson (review by hand):")
    for v, t, c, why, info in review:
        print(f"  {v} ({why}): lesson says \"{t}\"{' by ' + c if c else ''}; YouTube says \"{info.get('title')}\" by {info.get('author_name')}")
sys.exit(1 if dead else 0)
