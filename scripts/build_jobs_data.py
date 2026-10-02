"""
Builds academy/data/jobs.json: real, live "who's hiring" listings per role,
sourced from each role's actual benchmark companies' own public job-board
APIs (Greenhouse / Lever / Ashby), never scraped or invented.

Run daily (see .github/workflows/refresh-jobs.yml) or by hand:
    python3 scripts/build_jobs_data.py
Idempotent and safe to re-run -- it always re-fetches live data and
overwrites academy/data/jobs.json and the JOBS_DATA block in
academy/data/data.js. After running it, also regenerate the static
catalog pages (scripts/generate_static_academy.js) so the new listings
appear in the baked HTML too.
"""
import json
import os
import re
import datetime
import urllib.request
import concurrent.futures

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY = datetime.date.today().isoformat()

# Verified via live probe on 2026-10-02: each of these companies has a
# public, unauthenticated job-board API. Display name -> (ats, token).
# Only companies that actually resolved with jobs > 0 are kept.
COMPANY_REGISTRY = {
    "OpenAI": ("ashby", "openai"),
    "Anthropic": ("greenhouse", "anthropic"),
    "Stripe": ("greenhouse", "stripe"),
    "Databricks": ("greenhouse", "databricks"),
    "Snowflake": ("ashby", "snowflake"),
    "Cohere": ("ashby", "cohere"),
    "Harvey": ("ashby", "harvey"),
    "Notion": ("ashby", "notion"),
    "Okta": ("greenhouse", "okta"),
    "Airbnb": ("greenhouse", "airbnb"),
    "Figma": ("greenhouse", "figma"),
    "Scale AI": ("greenhouse", "scaleai"),
    "Palantir": ("lever", "palantir"),
    "Coinbase": ("greenhouse", "coinbase"),
    "Reddit": ("greenhouse", "reddit"),
    "Pinterest": ("greenhouse", "pinterest"),
    "Robinhood": ("greenhouse", "robinhood"),
    "Affirm": ("greenhouse", "affirm"),
    "GitLab": ("greenhouse", "gitlab"),
    "Jane Street": ("greenhouse", "janestreet"),
    "Vercel": ("greenhouse", "vercel"),
    "Twitch": ("greenhouse", "twitch"),
    "Qualtrics": ("greenhouse", "qualtrics"),
    "Axon": ("greenhouse", "axon"),
    "JetBrains": ("greenhouse", "jetbrains"),
    "Kong": ("ashby", "kong"),
    "Metropolis": ("greenhouse", "metropolis"),
    "OneTrust": ("greenhouse", "onetrust"),
    "Aera Technology": ("lever", "aeratechnology"),
}

# Pure grammatical glue -- stripped entirely, never counts toward a match.
STOPWORDS = set("""
a an the and or of for in on with to from at as by is are
role roles track certificate certification mastery i ii iii iv
""".split())

# Real words, but so common across job titles at any company (especially an
# AI company) that matching on ONE of these alone produces false positives
# (e.g. "Finance AI Consultant" matching any OpenAI job because it says
# "AI"; "Product Designer" matching Stripe sales jobs because they say
# "Product"). A candidate needs >=1 STRONG token match, or >=2 WEAK token
# matches, to count as relevant -- never a single weak token alone.
WEAK_TOKENS = set("""
ai product data manager engineer lead director platform strategy
operations technical senior staff growth business program solutions
enterprise global principal associate specialist consultant analyst
digital cloud security system systems application applications
""".split())


def parse_iso(dt_str):
    if not dt_str:
        return None
    try:
        return datetime.datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception:
        return None


def fetch_jobs(ats, token):
    headers = {"User-Agent": "Mozilla/5.0 (compatible; ZuyiniAcademy/1.0)"}
    if ats == "greenhouse":
        url = f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        out = []
        for j in data.get("jobs", []):
            loc = (j.get("location") or {}).get("name") or ""
            # first_published is the actual posting date; updated_at can
            # bump from a minor edit without the job being newly posted.
            posted = parse_iso(j.get("first_published") or j.get("updated_at"))
            out.append({
                "title": j.get("title", "").strip(),
                "location": loc,
                "url": j.get("absolute_url", ""),
                "posted": posted,
            })
        return out
    if ats == "lever":
        url = f"https://api.lever.co/v0/postings/{token}?mode=json"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        out = []
        for j in data:
            cats = j.get("categories") or {}
            loc = cats.get("location") or ""
            posted = None
            created_ms = j.get("createdAt")
            if created_ms:
                posted = datetime.datetime.fromtimestamp(created_ms / 1000, tz=datetime.timezone.utc)
            out.append({
                "title": j.get("text", "").strip(),
                "location": loc,
                "url": j.get("hostedUrl", ""),
                "posted": posted,
            })
        return out
    if ats == "ashby":
        url = f"https://api.ashbyhq.com/posting-api/job-board/{token}"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        out = []
        for j in data.get("jobs", []):
            loc = j.get("location", "") or ""
            posted = parse_iso(j.get("publishedAt"))
            out.append({
                "title": (j.get("title") or "").strip(),
                "location": loc,
                "url": j.get("jobUrl", ""),
                "posted": posted,
            })
        return out
    return []


def tokenize(text):
    words = re.findall(r"[A-Za-z][A-Za-z0-9']*", text.lower())
    return [w for w in words if w not in STOPWORDS and len(w) > 1]


def score_job(role_tokens, job_title):
    title_tokens = set(tokenize(job_title))
    strong = sum(1 for t in role_tokens if t in title_tokens and t not in WEAK_TOKENS)
    weak = sum(1 for t in role_tokens if t in title_tokens and t in WEAK_TOKENS)
    if strong >= 1 or weak >= 2:
        return strong * 2 + weak
    return 0


def company_mentioned(name, benchmark_text):
    return re.search(r"\b" + re.escape(name) + r"\b", benchmark_text) is not None


# Only show jobs posted recently -- a stale 2-year-old listing isn't a
# useful signal of what's "hiring right now". 7 days is wide enough that
# most matched roles still have real candidates (a 24h-only window leaves
# almost nothing: most companies post in bursts, not daily, per role).
RECENCY_WINDOW_DAYS = 7
NEW_TODAY_HOURS = 24


def main():
    roles = json.load(open(f"{ROOT}/academy/data/roles.json"))
    now = datetime.datetime.now(datetime.timezone.utc)
    cutoff = now - datetime.timedelta(days=RECENCY_WINDOW_DAYS)

    print("Fetching live job boards for", len(COMPANY_REGISTRY), "companies...")
    company_jobs = {}

    def fetch_one(item):
        name, (ats, token) = item
        try:
            jobs = fetch_jobs(ats, token)
            return name, jobs
        except Exception as e:
            print("  FAILED:", name, "-", e)
            return name, []

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        for name, jobs in ex.map(fetch_one, COMPANY_REGISTRY.items()):
            recent = [j for j in jobs if j["posted"] and j["posted"] >= cutoff]
            company_jobs[name] = recent
            print(f"  {name}: {len(jobs)} total postings, {len(recent)} within {RECENCY_WINDOW_DAYS}d")

    print()
    print("Matching roles to companies and relevant, recent openings...")
    jobs_by_role = {}
    roles_matched = 0
    total_jobs_shown = 0

    for role in roles:
        benchmark = role.get("benchmark", "")
        matched_companies = [
            name for name in COMPANY_REGISTRY
            if company_mentioned(name, benchmark)
        ]
        if not matched_companies:
            continue

        role_tokens = set(tokenize(role["name"]))
        candidates = []
        for co in matched_companies:
            for job in company_jobs.get(co, []):
                score = score_job(role_tokens, job["title"])
                if score >= 1:
                    age_hours = (now - job["posted"]).total_seconds() / 3600
                    candidates.append({
                        "title": job["title"],
                        "company": co,
                        "location": job["location"],
                        "url": job["url"],
                        "postedDate": job["posted"].date().isoformat(),
                        "isNew": age_hours <= NEW_TODAY_HOURS,
                        "_score": score,
                        "_posted": job["posted"],
                    })

        if not candidates:
            continue

        candidates.sort(key=lambda j: j["_posted"], reverse=True)
        candidates.sort(key=lambda j: -j["_score"])
        top = candidates[:6]
        for j in top:
            del j["_score"]
            del j["_posted"]

        slug = re.sub(r"[^a-z0-9]+", "-", role["name"].lower()).strip("-")
        jobs_by_role[slug] = {
            "companies": sorted(set(j["company"] for j in top)),
            "jobs": top,
            "asOf": TODAY,
        }
        roles_matched += 1
        total_jobs_shown += len(top)

    print(f"\n{roles_matched} of {len(roles)} roles matched with real, relevant openings")
    print(f"{total_jobs_shown} total job listings surfaced")

    with open(f"{ROOT}/academy/data/jobs.json", "w") as f:
        json.dump(jobs_by_role, f, indent=0)
    print("\nwritten: academy/data/jobs.json")

    # Fold the refresh straight into data.js (the file academy.js and the
    # static-site generator actually load) so a daily run is one command.
    data_js_path = f"{ROOT}/academy/data/data.js"
    content = open(data_js_path).read()
    lines = [l for l in content.split("\n") if not l.startswith("var JOBS_DATA")]
    content = "\n".join(lines).rstrip("\n") + "\n"
    content += "var JOBS_DATA = " + json.dumps(jobs_by_role, separators=(",", ": ")) + ";\n"
    open(data_js_path, "w").write(content)
    print("updated: academy/data/data.js (JOBS_DATA)")


if __name__ == "__main__":
    main()
