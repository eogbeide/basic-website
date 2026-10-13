"""
Builds academy/data/hot-roles.json: a frozen weekly snapshot of the 3 roles
with the most live job openings right now, each with its top skills -- the
data behind the Academy homepage's "Hot Right Now" banner.

This intentionally does NOT recompute on every page load from the daily
jobs.json refresh. The banner is meant to read "this week's hottest
roles", stable for every visitor all week, not flicker as the daily
refresh naturally shifts counts by one or two openings. So this script
runs on its own weekly schedule (see .github/workflows/refresh-hot-roles.yml)
and reads academy/data/jobs.json exactly as the most recent daily refresh
left it -- it does not re-fetch job boards itself.

Run weekly (via the workflow) or by hand:
    python3 scripts/build_hot_roles.py
Idempotent and safe to re-run -- it always overwrites
academy/data/hot-roles.json and the HOT_ROLES_DATA block in
academy/data/data.js.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def slugify(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def truncate(s, n):
    s = s.strip()
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def top_skills(role):
    # One pill per competency (not per "/"-delimited fragment) -- mirrors
    # academy.js's topSkills(): most roles write coverage as a single
    # clean skill phrase, but a few use "/" as a word-separator within one
    # phrase rather than between distinct skills, so splitting on it would
    # shred those into unreadable single-word fragments.
    skills = []
    for level in role.get("levels", []):
        for comp in level.get("competencies", []):
            coverage = (comp.get("coverage") or "").strip()
            if coverage and coverage not in skills:
                skills.append(truncate(coverage, 38))
            if len(skills) >= 3:
                return skills
    return skills


def main():
    jobs_by_role = json.load(open(f"{ROOT}/academy/data/jobs.json"))
    roles = json.load(open(f"{ROOT}/academy/data/roles.json"))
    roles_by_slug = {slugify(r["name"]): r for r in roles}

    ranked = []
    for slug, entry in jobs_by_role.items():
        role = roles_by_slug.get(slug)
        jobs = entry.get("jobs", [])
        if not role or not jobs:
            continue
        ranked.append({
            "slug": slug,
            "name": role["name"],
            "count": len(jobs),
            "newCount": sum(1 for j in jobs if j.get("isNew")),
            "skills": top_skills(role),
        })

    ranked.sort(key=lambda r: (-r["count"], -r["newCount"]))
    top3 = ranked[:3]

    print(f"{len(ranked)} roles have live openings; snapshotting top {len(top3)}:")
    for r in top3:
        print(f"  {r['name']}: {r['count']} openings ({r['newCount']} new)")

    with open(f"{ROOT}/academy/data/hot-roles.json", "w") as f:
        json.dump(top3, f, indent=2)
    print("\nwritten: academy/data/hot-roles.json")

    # Fold into data.js (the file academy.js actually loads), same
    # strip-then-append pattern build_jobs_data.py uses for JOBS_DATA.
    data_js_path = f"{ROOT}/academy/data/data.js"
    content = open(data_js_path).read()
    lines = [l for l in content.split("\n") if not l.startswith("var HOT_ROLES_DATA")]
    content = "\n".join(lines).rstrip("\n") + "\n"
    content += "var HOT_ROLES_DATA = " + json.dumps(top3, separators=(",", ": ")) + ";\n"
    open(data_js_path, "w").write(content)
    print("updated: academy/data/data.js (HOT_ROLES_DATA)")


if __name__ == "__main__":
    main()
