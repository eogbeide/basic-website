"""
Zuyini Job Radar: compiles and sends each subscriber's personalized job
digest -- real, ranked openings for their chosen role, pulled from
sources we're actually allowed to use for free:

  - This role's own benchmark-employer job boards (academy/data/jobs.json,
    the same Greenhouse/Lever/Ashby-sourced data the site's "Who's Hiring"
    blocks already use)
  - RemoteOK's public JSON API (https://remoteok.com/api, free, no key)
  - We Work Remotely's public RSS feed (free, no key)

LinkedIn and Indeed have no free public search API, and scraping their
results isn't something this project does -- so instead of pulling fake
or scraped listings from them, every digest includes a direct, pre-filled
search link to each, clearly labeled as a link out rather than a result.

Run weekly (see .github/workflows/job-radar-digest.yml) or by hand:
    python3 scripts/build_job_radar_digest.py
Requires the KIT_API_KEY environment variable (Kit/ConvertKit's v4 "API
Key", from Settings -> Developer in the Kit dashboard -- a different,
more powerful credential than the public v3 key already embedded in
gate.js/job-radar.js, so it must only ever live server-side as a GitHub
Actions secret, never in client-side code).
"""
import datetime
import html as html_lib
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY = datetime.date.today()
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

KIT_API_KEY = os.environ.get("KIT_API_KEY")
KIT_BASE = "https://api.kit.com/v4"

# Only true connector words -- NOT role-type words like "engineer" /
# "manager" / "analyst", since those are often the one thing that makes a
# role name specific rather than generic (e.g. "Data Engineer" really is
# just "data" + "engineer" with equal weight; stripping "engineer" would
# leave the single token "data", which matches almost any data-adjacent
# posting regardless of role).
STOPWORDS = {"a", "an", "and", "or", "the", "of", "for", "to", "in", "on", "with"}


def tokenize(name):
    words = re.findall(r"[a-z0-9]+", name.lower())
    return [w for w in words if w not in STOPWORDS and len(w) > 2]


def match_score(role_tokens, haystack_tokens):
    # Require more than a single coincidental word match once the role
    # name actually has more than one meaningful word to match against,
    # so e.g. "Data Engineer" needs both "data" and "engineer" present,
    # not just any posting that happens to mention "data".
    score = sum(1 for t in role_tokens if t in haystack_tokens)
    min_required = 1 if len(role_tokens) <= 1 else 2
    return score if score >= min_required else 0


def slugify(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def fetch_json(url, params=None, timeout=20):
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_text(url, timeout=20):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


# --- Source 1: benchmark-employer boards (already role-matched) -----------

def load_benchmark_jobs():
    return json.load(open(f"{ROOT}/academy/data/jobs.json"))


def benchmark_matches(role_slug, benchmark_jobs, remote_only, state_pref):
    entry = benchmark_jobs.get(role_slug)
    if not entry:
        return []
    out = []
    for j in entry["jobs"]:
        if remote_only and j.get("state") != "Remote":
            continue
        if (not remote_only) and state_pref and j.get("state") not in (state_pref, "Remote", None):
            continue
        out.append({
            "title": j["title"],
            "company": j["company"],
            "location": j.get("location") or "",
            "url": j["url"],
            "postedDate": j["postedDate"],
            "source": "Benchmark employer",
            "sourceDetail": j["company"],
        })
    return out


# --- Source 2: RemoteOK ------------------------------------------------

def fetch_remoteok():
    try:
        data = fetch_json("https://remoteok.com/api")
    except Exception as e:
        print("  RemoteOK fetch failed:", e)
        return []
    # First element is a metadata/legal object, not a job.
    return [j for j in data if isinstance(j, dict) and j.get("id")]


def remoteok_matches(role_tokens, remoteok_jobs):
    out = []
    for j in remoteok_jobs:
        hay_tokens = set(tokenize(j.get("position", "") + " " + " ".join(j.get("tags", []))))
        score = match_score(role_tokens, hay_tokens)
        if score == 0:
            continue
        posted = datetime.date.fromtimestamp(j["epoch"]).isoformat() if j.get("epoch") else TODAY.isoformat()
        out.append({
            "title": j.get("position", "Untitled role"),
            "company": j.get("company", ""),
            "location": "Remote",
            "url": j.get("url") or ("https://remoteok.com/remote-jobs/" + str(j.get("id"))),
            "postedDate": posted,
            "source": "RemoteOK",
            "sourceDetail": "RemoteOK",
            "_score": score,
        })
    return out


# --- Source 3: We Work Remotely -----------------------------------------

def fetch_we_work_remotely():
    try:
        xml_text = fetch_text("https://weworkremotely.com/remote-jobs.rss")
    except Exception as e:
        print("  We Work Remotely fetch failed:", e)
        return []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        print("  We Work Remotely RSS parse failed:", e)
        return []
    items = []
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        category = (item.findtext("category") or "").strip()
        pub_date = (item.findtext("pubDate") or "").strip()
        posted = TODAY.isoformat()
        if pub_date:
            try:
                dt = datetime.datetime.strptime(pub_date.split(" +")[0].split(" -")[0].strip(), "%a, %d %b %Y %H:%M:%S")
                posted = dt.date().isoformat()
            except ValueError:
                pass
        items.append({"title": title, "link": link, "category": category, "postedDate": posted})
    return items


def we_work_remotely_matches(role_tokens, wwr_items):
    out = []
    for it in wwr_items:
        hay_tokens = set(tokenize(it["title"] + " " + it["category"]))
        score = match_score(role_tokens, hay_tokens)
        if score == 0:
            continue
        # Title is usually "Company: Role Title".
        parts = it["title"].split(":", 1)
        company = parts[0].strip() if len(parts) == 2 else ""
        role_title = parts[1].strip() if len(parts) == 2 else it["title"]
        out.append({
            "title": role_title,
            "company": company,
            "location": "Remote",
            "url": it["link"],
            "postedDate": it["postedDate"],
            "source": "We Work Remotely",
            "sourceDetail": "We Work Remotely",
            "_score": score,
        })
    return out


# --- Ranking + Zuyini course matching --------------------------------------

def rank_matches(benchmark, remoteok, wwr, limit=10):
    for j in benchmark:
        j["_score"] = 3  # already role-matched upstream; weight it highest
    combined = benchmark + remoteok + wwr
    combined.sort(key=lambda j: (-j["_score"], j["postedDate"]), reverse=False)
    combined.sort(key=lambda j: j["_score"], reverse=True)
    # stable secondary sort by recency within equal scores
    combined.sort(key=lambda j: (j["_score"], j["postedDate"]), reverse=True)
    seen = set()
    out = []
    for j in combined:
        if j["url"] in seen:
            continue
        seen.add(j["url"])
        out.append(j)
        if len(out) >= limit:
            break
    return out


def matching_courses(role):
    courses = []
    for level in role.get("levels", [])[:2]:
        for comp in level.get("competencies", [])[:1]:
            vids = comp.get("videos", [])
            if vids:
                courses.append({"title": comp["title"], "video": vids[0]})
    return courses


# --- HTML rendering -------------------------------------------------------

def esc(s):
    return html_lib.escape(s or "")


def render_digest_html(subscriber_name, role, location_label, matches, courses, role_slug):
    q = urllib.parse.quote(role["name"] + " jobs")
    linkedin_url = f"https://www.linkedin.com/jobs/search/?keywords={q}&f_WT=2" if location_label == "Remote" else f"https://www.linkedin.com/jobs/search/?keywords={q}&location=United%20States"
    indeed_url = f"https://www.indeed.com/jobs?q={q}&l=Remote" if location_label == "Remote" else f"https://www.indeed.com/jobs?q={q}&l=United+States"

    rows = ""
    for m in matches:
        rows += (
            f'<tr><td style="padding:10px 0;border-bottom:1px solid #2a2a2a;">'
            f'<a href="{esc(m["url"])}" style="color:#ffc629;font-weight:700;text-decoration:none;">{esc(m["title"])}</a><br>'
            f'<span style="color:#a8a8a8;font-size:13px;">{esc(m["company"])} &middot; {esc(m["location"])} &middot; via {esc(m["source"])}</span>'
            f'</td></tr>'
        )
    if not rows:
        rows = '<tr><td style="padding:10px 0;color:#a8a8a8;">No fresh matches from our free sources this cycle &mdash; try the LinkedIn/Indeed links below.</td></tr>'

    course_rows = ""
    for c in courses:
        course_rows += (
            f'<tr><td style="padding:8px 0;">'
            f'<a href="{esc(c["video"]["url"])}" style="color:#ffc629;text-decoration:none;">{esc(c["title"])}</a>'
            f'</td></tr>'
        )

    return f"""
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <p>Hi {esc(subscriber_name)},</p>
  <p>Here's your {esc(role["name"])} Job Radar for this cycle ({esc(location_label)}):</p>
  <table width="100%" cellpadding="0" cellspacing="0">{rows}</table>
  <p style="margin-top:20px;"><strong>Not on our free sources yet? Check directly:</strong><br>
    <a href="{esc(linkedin_url)}" style="color:#ffc629;">Search on LinkedIn &rarr;</a> &nbsp;|&nbsp;
    <a href="{esc(indeed_url)}" style="color:#ffc629;">Search on Indeed &rarr;</a>
  </p>
  <p style="margin-top:20px;"><strong>Brush up for these roles with free Zuyini courses:</strong></p>
  <table width="100%" cellpadding="0" cellspacing="0">{course_rows}</table>
  <p style="margin-top:20px;"><a href="https://zuyini.com/academy/roles/{esc(role_slug)}/" style="color:#ffc629;">Open the full {esc(role["name"])} learning path on Zuyini &rarr;</a></p>
  <p style="margin-top:24px;color:#6f6f6f;font-size:12px;">Sources: this role's benchmark employers, RemoteOK, We Work Remotely. Postings close fast -- confirm details on the employer's own site before applying.</p>
</div>
""".strip()


# --- Kit (ConvertKit) v4 API ------------------------------------------------

def kit_request(method, path, body=None):
    url = KIT_BASE + path
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "X-Kit-Api-Key": KIT_API_KEY,
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"  Kit API error {e.code} on {method} {path}: {e.read().decode('utf-8', errors='replace')[:300]}")
        raise


def kit_get_or_create_tag(name):
    # Idempotent on name (case-insensitive): returns the existing tag if
    # one already has this name, otherwise creates it. Safe to call every
    # run rather than hardcoding a tag ID anywhere.
    data = kit_request("POST", "/tags", {"name": name})
    return data["tag"]["id"]


def kit_tag_subscriber(tag_id, subscriber_id):
    kit_request("POST", f"/tags/{tag_id}/subscribers/{subscriber_id}", {})


def kit_untag_subscriber(tag_id, subscriber_id):
    kit_request("DELETE", f"/tags/{tag_id}/subscribers/{subscriber_id}")


def kit_list_subscribers():
    subscribers = []
    cursor = None
    while True:
        params = {"include_total_count": "false"}
        if cursor:
            params["after"] = cursor
        data = kit_request("GET", "/subscribers?" + urllib.parse.urlencode(params))
        subscribers.extend(data.get("subscribers", []))
        pagination = data.get("pagination", {})
        if not pagination.get("has_next_page"):
            break
        cursor = pagination.get("end_cursor")
    return subscribers


def is_due(frequency, run_week_number):
    # Weekly: every run. Biweekly: even ISO weeks. Monthly: weeks 1-4 of a
    # repeating 4-week cycle, pick week 1 -- simple, no per-subscriber
    # "last sent" state to track or drift out of sync.
    if frequency == "Weekly":
        return True
    if frequency == "Biweekly":
        return run_week_number % 2 == 0
    if frequency == "Monthly":
        return run_week_number % 4 == 0
    return False


def main():
    if not KIT_API_KEY:
        print("KIT_API_KEY not set -- nothing to send. (Data-fetch/ranking logic can still be tested standalone.)")
        sys.exit(0)

    roles = json.load(open(f"{ROOT}/academy/data/roles.json"))
    roles_by_slug = {slugify(r["name"]): r for r in roles}
    benchmark_jobs = load_benchmark_jobs()

    print("Fetching RemoteOK...")
    remoteok_raw = fetch_remoteok()
    print(f"  {len(remoteok_raw)} listings")

    print("Fetching We Work Remotely...")
    wwr_raw = fetch_we_work_remotely()
    print(f"  {len(wwr_raw)} listings")

    print("Listing Job Radar subscribers...")
    subscribers = kit_list_subscribers()
    run_week = TODAY.isocalendar()[1]
    send_now_tag_id = kit_get_or_create_tag("job-radar-send-now")

    tagged_ids = []
    for sub in subscribers:
        fields = sub.get("fields") or {}
        role_name = fields.get("job_radar_role")
        frequency = fields.get("job_radar_frequency")
        location_pref = fields.get("job_radar_location") or ""
        if not role_name or not frequency:
            continue
        if not is_due(frequency, run_week):
            continue
        role_slug = slugify(role_name)
        role = roles_by_slug.get(role_slug)
        if not role:
            continue

        remote_only = location_pref.strip().lower() == "remote"
        state_pref = None if remote_only else location_pref.strip() or None
        role_tokens = tokenize(role_name)

        benchmark = benchmark_matches(role_slug, benchmark_jobs, remote_only, state_pref)
        remoteok = remoteok_matches(role_tokens, remoteok_raw)
        wwr = we_work_remotely_matches(role_tokens, wwr_raw)
        matches = rank_matches(benchmark, remoteok, wwr)
        courses = matching_courses(role)

        digest_html = render_digest_html(
            sub.get("first_name") or "there",
            role,
            "Remote" if remote_only else (state_pref or "Anywhere"),
            matches,
            courses,
            role_slug,
        )

        kit_request("PUT", f"/subscribers/{sub['id']}", {
            "fields": {"job_radar_digest": digest_html},
        })
        kit_tag_subscriber(send_now_tag_id, sub["id"])
        tagged_ids.append(sub["id"])
        print(f"  queued: {sub.get('email_address')} -> {role['name']} ({len(matches)} matches)")

    print(f"\nCompiled digests for {len(tagged_ids)} subscriber(s) due this run.")
    if tagged_ids:
        print("Creating and sending broadcast...")
        kit_request("POST", "/broadcasts", {
            "subject": "Your Zuyini Job Radar",
            "content": "{{ subscriber.job_radar_digest }}",
            "subscriber_filter": [{"all": [{"type": "tag", "ids": [send_now_tag_id]}]}],
            "send_at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "public": False,
        })
        print("Broadcast created and scheduled to send immediately.")
        print("Removing the send-now tag so next run starts clean...")
        for sid in tagged_ids:
            kit_untag_subscriber(send_now_tag_id, sid)
        print("Done.")
    else:
        print("No subscribers due this run.")


if __name__ == "__main__":
    main()
