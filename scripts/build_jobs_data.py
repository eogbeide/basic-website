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

# --- US-only location filtering -------------------------------------------
# Job-board location fields are free text in wildly different formats
# ("San Francisco, CA", "US-CA-Menlo Park", "Dublin, IE", "Remote, United
# States", pipe/semicolon-separated multi-location strings...). classify_
# location() below returns (is_us, state_or_none) so non-US postings can be
# excluded entirely and the rest can be filtered/labeled by US state.
US_STATE_ABBR = set("""
AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO
MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC
""".split())

US_STATE_NAME_TO_ABBR = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
    "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN",
    "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE",
    "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ",
    "new mexico": "NM", "new york": "NY", "north carolina": "NC",
    "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR",
    "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
    "vermont": "VT", "virginia": "VA", "washington": "WA",
    "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
    "district of columbia": "DC",
}

US_CITY_TO_STATE = {
    "new york city": "NY", "nyc": "NY", "new york": "NY",
    "san francisco": "CA", "sf": "CA", "menlo park": "CA",
    "los angeles": "CA", "san diego": "CA", "palo alto": "CA",
    "mountain view": "CA", "sunnyvale": "CA", "santa clara": "CA",
    "seattle": "WA", "bellevue": "WA",
    "boston": "MA", "cambridge": "MA",
    "chicago": "IL",
    "austin": "TX", "dallas": "TX", "houston": "TX",
    "denver": "CO", "boulder": "CO",
    "atlanta": "GA",
    "miami": "FL",
    "washington": "DC", "washington dc": "DC",
    "portland": "OR",
    "philadelphia": "PA",
    "phoenix": "AZ",
    "detroit": "MI",
    "minneapolis": "MN",
    "salt lake city": "UT",
    "raleigh": "NC", "durham": "NC",
    "nashville": "TN",
}

NON_US_SIGNALS = set("""
india ireland uk united kingdom germany japan australia canada singapore
switzerland poland france spain italy netherlands sweden norway denmark
finland brazil mexico argentina china korea south korea philippines
vietnam thailand indonesia malaysia israel uae united arab emirates
egypt nigeria kenya south africa portugal austria belgium czech
czech republic romania hungary greece ukraine russia new zealand
ie ch pl de fr es it nl se no dk fi br mx ar cn kr ph vn th id my il ae
eg ng ke za pt at be cz ro hu gr ua ru nz au in jp sg ca gb
bangalore bengaluru mumbai delhi hyderabad pune chennai
dublin london munich berlin paris madrid barcelona tokyo osaka
sydney melbourne toronto vancouver montreal ontario quebec
singapore seoul zurich zürich geneva amsterdam warsaw
""".split())


def classify_location(raw):
    """Returns (is_us: bool, state: str|None). state is a 2-letter code,
    "Remote" for US-remote-no-state-given, or None if US but unspecified."""
    if not raw or not raw.strip():
        return (False, None)
    segments = re.split(r"[;|]|(?:\s+OR\s+)", raw)
    found_us_state = None
    found_us_remote = False
    found_non_us = False
    found_any_us_signal = False

    for seg in segments:
        seg = seg.strip()
        if not seg:
            continue
        seg_l = seg.lower()
        is_remote = "remote" in seg_l

        if "united states" in seg_l or re.search(r"\busa\b", seg_l) or re.search(r"^us-", seg, re.I):
            found_any_us_signal = True
            if is_remote:
                found_us_remote = True
            m = re.search(r"\bUS-([A-Z]{2})\b", seg)
            if m and m.group(1) in US_STATE_ABBR:
                found_us_state = found_us_state or m.group(1)
            continue

        parts = [p.strip() for p in seg.split(",")]
        matched_state_here = None
        for p in parts:
            p_clean = p.strip()
            if p_clean.upper() in US_STATE_ABBR and len(p_clean) == 2:
                matched_state_here = p_clean.upper()
            elif p_clean.lower() in US_STATE_NAME_TO_ABBR:
                matched_state_here = US_STATE_NAME_TO_ABBR[p_clean.lower()]
        if matched_state_here:
            found_any_us_signal = True
            found_us_state = found_us_state or matched_state_here
            continue

        city_key = seg_l.replace("remote", "").replace("-", " ").strip(" ,")
        city_hit = None
        for city, st in US_CITY_TO_STATE.items():
            if city in city_key:
                city_hit = st
                break

        non_us_hit = any(sig in seg_l for sig in NON_US_SIGNALS)

        if non_us_hit and not city_hit:
            found_non_us = True
            continue
        if city_hit:
            found_any_us_signal = True
            found_us_state = found_us_state or city_hit
            continue
        if is_remote and not non_us_hit:
            found_us_remote = found_us_remote or False

    if found_us_state:
        return (True, found_us_state)
    if found_us_remote:
        return (True, "Remote")
    if found_any_us_signal:
        return (True, None)
    return (False, None)

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


def diversify(candidates, limit):
    """Round-robins across companies (each company's own sub-list already
    sorted best-first) instead of just slicing the globally-sorted list --
    otherwise whichever company posted the most this week (OpenAI, usually)
    dominates every slot, even when a role matched several companies."""
    order = []
    by_company = {}
    for c in candidates:
        if c["company"] not in by_company:
            by_company[c["company"]] = []
            order.append(c["company"])
        by_company[c["company"]].append(c)
    cursor = {co: 0 for co in order}
    result = []
    while len(result) < limit:
        added = False
        for co in order:
            if cursor[co] < len(by_company[co]):
                result.append(by_company[co][cursor[co]])
                cursor[co] += 1
                added = True
                if len(result) >= limit:
                    break
        if not added:
            break
    return result


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
            us_recent = []
            for j in recent:
                is_us, state = classify_location(j["location"])
                if is_us:
                    j["state"] = state
                    us_recent.append(j)
            company_jobs[name] = us_recent
            print(f"  {name}: {len(jobs)} total postings, {len(recent)} within {RECENCY_WINDOW_DAYS}d, {len(us_recent)} US")

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
                        "state": job.get("state"),
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
        top = diversify(candidates, 6)
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
