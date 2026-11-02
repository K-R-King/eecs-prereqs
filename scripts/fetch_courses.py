"""
Build data/courses.json from the EECS department's course pages.

The CS and EE list pages link to every course; each course page has the title, units,
catalog description, related areas, official prerequisite text, and the terms it's offered.
We keep undergraduate courses (numbered below 200), skipping seminars, DeCals, special topics
and independent study, whose prerequisites change every term.

Usage (from the project root):  python scripts/fetch_courses.py
"""

import datetime
import html
import json
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

OUTPUT = Path(__file__).resolve().parents[1] / "data" / "courses.json"
SITE = "https://www2.eecs.berkeley.edu"
LISTS = ["CS", "EE"]  # the EE list includes EECS courses
SEASONS = ("Fall", "Spring", "Summer")

# seminars, DeCals, special topics, field work, independent study, honors thesis, online copies
SKIP_NUMBERS = {"24", "36", "39", "84", "97", "98", "99", "194", "197", "198", "199"}

# how the department writes subjects inside prerequisite text -> our prefix
SUBJECTS = {
    "COMPSCI": "CS", "CS": "CS", "EL ENG": "EE", "ELENG": "EE", "EE": "EE", "EECS": "EECS",
    "MATH": "MATH", "MATHEMATICS": "MATH", "PHYSICS": "PHYS", "STAT": "STAT", "STATISTICS": "STAT",
    "DATA": "DATA", "ENGIN": "ENGIN", "ENGINEERING": "ENGIN", "BIOENG": "BIOENG", "MEC ENG": "ME",
}
# old or cross-listed names -> the code we use
ALIASES = {
    "MATH1A": "MATH51", "MATH1B": "MATH52", "EECS16A": "EE66", "EECS16B": "EE64",
    "DATAC100": "CSC100", "STATC100": "CSC100", "DATAC8": "DATA8", "STATC8": "DATA8", "CSC8": "DATA8",
}

# courses outside EECS that EECS prerequisites point to
OUTSIDE = {
    "MATH51": ("MATH 51", "Calculus I (formerly Math 1A)"),
    "MATH52": ("MATH 52", "Calculus II (formerly Math 1B)"),
    "MATH53": ("MATH 53", "Multivariable Calculus"),
    "MATH54": ("MATH 54", "Linear Algebra & Differential Equations"),
    "MATH55": ("MATH 55", "Discrete Mathematics"),
    "MATH56": ("MATH 56", "Linear Algebra"),
    "MATH104": ("MATH 104", "Introduction to Analysis"),
    "MATH110": ("MATH 110", "Abstract Linear Algebra"),
    "MATH113": ("MATH 113", "Introduction to Abstract Algebra"),
    "PHYS7A": ("PHYSICS 7A", "Physics for Scientists & Engineers (Mechanics)"),
    "PHYS7B": ("PHYSICS 7B", "Physics for Scientists & Engineers (Heat, Electricity & Magnetism)"),
    "PHYS7C": ("PHYSICS 7C", "Physics for Scientists & Engineers (Waves, Optics & Modern Physics)"),
    "STAT134": ("STAT 134", "Concepts of Probability"),
    "STAT140": ("STAT 140", "Probability for Data Science"),
    "DATA8": ("DATA 8", "Foundations of Data Science"),
}

# Prerequisites read by hand from each page's official text, since the wording is too varied to
# parse reliably. Each entry is (required, together): every group in a list must be met, and
# any one course in a group meets it; "together" groups may also be taken the same term.
# "(A and B) or C" is written as [A or C] and [B or C]. Recommended courses are left out, as are
# alternatives with no page here (e.g. ENGIN 7, PHYSICS 89); the site always shows the full text.
# New courses fall back to the parser and are marked unreviewed until added here.
R = lambda *groups: [list(g) for g in groups]  # noqa: E731
MANUAL = {
    "CS10": (R(), R()),
    "CS150": (R(["CS61C"]), R()),                                   # also "EE 40", an old course
    "CS152": (R(["CS61C"]), R()),
    "CS160": (R(["CS61B", "CS61BL"]), R()),
    "CS161": (R(["CS61B"], ["CS61C"], ["CS70"]), R()),
    "CS162": (R(["CS61B"], ["CS61C"], ["CS70"]), R()),
    "CS164": (R(["CS61B"], ["CS61C"]), R()),
    "CS168": (R(["CS61B"]), R()),
    "CS169A": (R(["CSC88C", "CS61A", "CS47A"], ["CS61B", "CS61BL", "CS47B"]), R()),
    "CS169L": (R(["CS169A"]), R()),
    "CS170": (R(["CS61B"], ["CS70"]), R()),
    "CS171": (R(["CS70"]), R()),
    "CS172": (R(["CS170"]), R()),
    "CS174": (R(["CS170"]), R()),
    "CS176": (R(["CS70"], ["CS170"]), R()),
    "CS180": (R(["CS61B"], ["MATH53"], ["MATH54", "MATH56", "MATH110", "EE66"]), R(["CSC182", "CS189"])),
    "CS184": (R(["CS61B"], ["MATH54", "MATH110"]), R()),
    "CS185": (R(["CS189"]), R()),
    "CS186": (R(["CS61C", "CS47C"]), R()),
    "CS188": (R(["CS61A"], ["CS61B"], ["CS70"]), R()),
    "CS189": (R(["MATH53"], ["MATH54"], ["CS70"]), R()),
    "CS195": (R(), R()),
    "CS47A": (R(["CS61B"]), R()),                                   # plus CS 9D and instructor consent
    "CS47B": (R(), R()),
    "CS47C": (R(), R()),
    "CS61A": (R(), R(["MATH51"])),
    "CS61B": (R(["CS61A", "CSC88C"]), R()),
    "CS61BL": (R(["CS61A", "CSC88C"]), R()),
    "CS61C": (R(["CS61A"], ["CS61B", "CS61BL"]), R()),
    "CS70": (R(), R()),                                             # "sophomore mathematical maturity"
    "CSC100": (R(["DATA8"], ["CS61A", "CSC88C"]), R(["MATH54", "MATH56", "MATH110", "EE66"])),
    "CSC177": (R(), R()),
    "CSC182": (R(["MATH53"], ["MATH54"], ["CS61B"], ["CS70", "STAT134"]), R()),
    "CSC187": (R(["CS61B"], ["CSC100", "CS189"]), R()),
    "CSC191": (R(["EE66", "MATH54"], ["CS70", "MATH55", "PHYS7C"]), R()),
    "DATA8": (R(), R()),                                            # CS C8 / DATA C8
    "CSC88C": (R(), R()),
    "EE105": (R(["EE66"], ["EE64"]), R()),
    "EE108": (R(["MATH54"], ["PHYS7B"], ["EE66"], ["EE64"]), R()),
    "EE113": (R(["EE108"]), R()),
    "EE113B": (R(["EE113"]), R()),
    "EE117": (R(["EE64"], ["MATH53"], ["MATH54"], ["PHYS7B"]), R()),
    "EE117B": (R(), R()),
    "EE118": (R(["MATH53"], ["EE64", "MATH54"], ["EE66", "MATH54"]), R()),
    "EE120": (R(["EE66"], ["EE64"]), R()),
    "EE121": (R(["EE64"], ["EE66"], ["CS70"]), R()),
    "EE122": (R(["CS70"]), R()),
    "EE123": (R(["EE120"]), R()),
    "EE130": (R(["EE64"], ["EE66"]), R()),
    "EE134": (R(["EE64", "MATH54"], ["EE64", "PHYS7B"], ["EE66", "MATH54"], ["EE66", "PHYS7B"]), R()),
    "EE137A": (R(["EE108"]), R()),
    "EE140": (R(["EE105"]), R()),
    "EE141": (R(), R()),                                            # "EE 40", an old course
    "EE142": (R(["EE64"], ["EE66"], ["EE105"]), R()),
    "EE143": (R(["PHYS7B"]), R()),
    "EE147": (R(["EE64"], ["EE66"]), R()),
    "EE156": (R(), R()),
    "EE192": (R(["EE64"], ["EE66"], ["CS61A"], ["CS61B"], ["CS61C"], ["EE120"]), R()),
    "EE64": (R(["MATH54"]), R()),
    "EE66": (R(["MATH54"]), R()),
    "EEC106A": (R(["EE120"]), R()),
    "EEC106B": (R(["EEC106A"]), R()),
    "EEC145B": (R(["EE64"], ["EE66"]), R()),
    "EEC145L": (R(), R()),
    "EEC145O": (R(["EE105", "EE120", "CS184"]), R()),               # the path for EECS students
    "EECS116": (R(["EEC106A"]), R()),
    "EECS126": (R(), R()),                                          # CS 70 "preferred but not required"
    "EECS127": (R(["EE66"], ["EE64"]), R()),
    "EECS144": (R(["EE66"], ["CS70"]), R()),
    "EECS149": (R(["CS61C"], ["CS70"], ["EE66"], ["EE64"]), R()),
    "EECS151": (R(["EE66"], ["EE64"]), R()),
    "EECS151LA": (R(["CS61C"], ["EE66"], ["EE64"], ["EE105"]), R()),
    "EECS151LB": (R(["EE66"], ["EE64"], ["CS61C"]), R()),
    "EECS183": (R(["CSC182", "CS188", "CS189"]), R()),
    "EECS47F": (R(["CS61A"]), R()),
    "EECSC128": (R(["EE66"]), R()),
    "EECSC191A": (R(["EE66", "MATH54"]), R()),
    "EECSC191B": (R(["EECSC191A"]), R()),
    # outside EECS, matching the EECS Planner
    "MATH52": (R(["MATH51"]), R()),
    "MATH53": (R(["MATH52"]), R()),
    "MATH54": (R(["MATH52"]), R()),
    "PHYS7A": (R(), R(["MATH51"])),
    "PHYS7B": (R(["PHYS7A"], ["MATH52"]), R()),
}

SUBJECT_RE = "|".join(sorted((re.escape(s) for s in SUBJECTS), key=len, reverse=True))
COURSE_REF = re.compile(rf"\b({SUBJECT_RE})\s*(C?\d+[A-Z]{{0,2}})\b")


def fetch(path):
    req = urllib.request.Request(SITE + path, headers={"User-Agent": "eecs-prereqs data refresh"})
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read().decode("utf-8", "replace")


def page_text(raw):
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", raw)))


def ref_code(subject, number):
    code = SUBJECTS[subject.upper()] + number.upper()
    return ALIASES.get(code, code)


def parse_prereqs(text):
    """
    Official text -> a list of requirement groups; every group is required, and any one
    course in a group satisfies it. Recommendations and "consent of instructor" are dropped.
    """
    text = re.sub(r"[^.;]*\b(recommended|preferred|strongly encouraged)\b[^.;]*", "", text, flags=re.I)
    text = re.sub(r",?\s*or (the )?consent of (the )?instructor", "", text, flags=re.I)

    groups = []
    for clause in re.split(r";|\.\s|\band\b", text):
        codes = [ref_code(s, n) for s, n in COURSE_REF.findall(clause)]
        codes = list(dict.fromkeys(codes))
        if not codes:
            continue
        if re.search(r"\bor\b|/|equivalent", clause, re.I) and len(codes) > 1:
            groups.append(codes)                       # any one of these
        else:
            groups.extend([c] for c in codes)          # each one required
    unique = []
    for g in groups:
        if g not in unique:
            unique.append(g)
    return unique


def course(path):
    raw = fetch(path)
    heading = re.search(r"<h1[^>]*>(.*?)</h1>", raw, re.S)
    if not heading:
        return None
    display, _, title = page_text(heading.group(1)).strip().partition(". ")
    text = page_text(raw)

    units = re.search(r"Units:\s*([\d.\-– ]+?)\s", text)
    formats = re.search(r"Formats:(.*?)(Grading [Bb]asis|$)", text)
    prereq = re.search(r"Prerequisites?:(.*?)(Credit Restrictions|Formats:|Grading)", text)
    areas = re.search(r"Related Areas:(.*?)(Prerequisites?:|Formats:|Course Objectives|Credit Restrictions)", text)
    description = re.search(r"Catalog Description:(.*?)(Units:|Course Objectives|Prerequisites?:|$)", text)

    terms = {t for t in SEASONS if formats and f"{t}:" in formats.group(1)}
    terms |= set(re.findall(r"Class Schedule \((Fall|Spring|Summer) \d{4}\)", text))
    prereq_text = prereq.group(1).strip() if prereq else ""

    return {
        "code": display.replace(" ", ""),
        "display": display.strip(),
        "title": title.strip(),
        "units": units.group(1).strip().replace("–", "-") if units else None,
        "terms": [t for t in SEASONS if t in terms],
        "areas": re.findall(r"([A-Z][A-Za-z ,&/-]+?) \([A-Z]{2,5}\)", areas.group(1)) if areas else [],
        "description": description.group(1).strip() if description else "",
        "prereq_text": prereq_text,
        "prereqs": parse_prereqs(prereq_text),
        "source": SITE + path,
    }


def course_paths():
    paths = set()
    for listing in LISTS:
        for code in re.findall(r'href="/Courses/([A-Z]+[0-9][A-Z0-9]*)/?"', fetch(f"/Courses/{listing}/")):
            number = re.match(r"[A-Z]+?(C|H|W)?(\d+)([A-Z]*)$", code)
            if not number or number.group(1) in ("H", "W"):
                continue
            if int(number.group(2)) >= 200 or number.group(2) in SKIP_NUMBERS:
                continue
            paths.add(f"/Courses/{code}/")
    return sorted(paths)


def main():
    with ThreadPoolExecutor(max_workers=6) as pool:
        found = [c for c in pool.map(course, course_paths()) if c]

    # cross-listed courses have a page under each department; keep one per title
    courses, titles = {}, set()
    for c in sorted(found, key=lambda c: (c["code"].startswith("EEC"), c["code"])):
        if c["title"] in titles or not c["title"]:
            continue
        titles.add(c["title"])
        courses[ALIASES.get(c["code"], c["code"])] = c

    unreviewed = []
    for code, c in courses.items():
        if code in MANUAL:
            c["prereqs"], c["coreqs"] = MANUAL[code]
            c["reviewed"] = True
        else:
            c["coreqs"], c["reviewed"] = [], False
            unreviewed.append(code)

    # outside courses that EECS prerequisites point to, plus the ones those need in turn
    outside = {}
    pending = [code for c in courses.values() for g in c["prereqs"] + c["coreqs"] for code in g]
    while pending:
        code = pending.pop()
        if code in courses or code in outside or code not in OUTSIDE:
            continue
        prereqs, coreqs = MANUAL.get(code, ([], []))
        outside[code] = {"code": code, "display": OUTSIDE[code][0], "title": OUTSIDE[code][1],
                         "outside": True, "prereqs": prereqs, "coreqs": coreqs, "reviewed": True}
        pending += [c for g in prereqs + coreqs for c in g]

    # a prerequisite we have no page or title for can't be shown or checked off; drop it
    known = set(courses) | set(outside)
    for c in courses.values():
        for key in ("prereqs", "coreqs"):
            c[key] = [g for g in ([code for code in g if code in known] for g in c[key]) if g]

    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps({
        "checked": datetime.date.today().isoformat(),
        "courses": courses,
        "outside": outside,
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(courses)} courses (+{len(outside)} outside EECS) to {OUTPUT}")
    for code in unreviewed:
        c = courses[code]
        print(f"  not reviewed yet, add to MANUAL: {code} {c['prereqs']} <- {c['prereq_text']!r}")


if __name__ == "__main__":
    main()
