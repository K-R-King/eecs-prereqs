# UC Berkeley EECS Prereqs

See what every undergraduate EECS course needs first, the full chain back to your first class, and what each course unlocks. A sister site to the [EECS Planner](https://eecs-planner.vercel.app) and [EECS Links](https://eecs-links.vercel.app).

## Features

- **78 undergraduate CS, EE and EECS courses**, plus the 11 math, physics and statistics courses they build on.
- **Full prerequisite chain** for every course, drawn as a diagram from your first class to that course. Click any course in it to jump there.
- **What it unlocks:** every course that lists it as a prerequisite.
- **Ready to take it?** Mark the courses you've taken and every course shows whether you've met its prerequisites. Filter to "only what I can take". Saved in your browser.
- **Search and filters:** by code, name, or area (e.g. "machine learning"), lower or upper division, department, and related area. Press `/` to search, `Enter` to open the first match.
- **Shareable links:** `#CS170` at the end of the URL opens that course.
- The official prerequisite text and a link to the EECS course page on every course.
- Light and dark mode, and a layout that works on phones.

## Running locally

```bash
npm install
npm run dev
```

Open `http://localhost:3002`. It uses port 3002 so it can run next to the planner (3000) and the links site (3001); in development the switcher points to those.

## Course data

`data/courses.json` is built from the [EECS department's course pages](https://www2.eecs.berkeley.edu/Courses/) by:

```bash
python scripts/fetch_courses.py
```

It reads every undergraduate course on the CS and EE lists (skipping seminars, DeCals, special topics and independent study), with its title, units, terms, related areas, description and official prerequisite text.

The official prerequisite wording varies too much to read reliably by machine, so each course's prerequisites were read by hand and written into `MANUAL` in the script. Each course has a list of requirements, and any one course in a requirement meets it. Some things are left out of the diagram but still appear in the official text on each course:

- recommended courses;
- "consent of instructor";
- alternatives with no page here (e.g. ENGIN 7, PHYSICS 89).

When the script finds a course that isn't in `MANUAL` yet, it falls back to a best-effort parse and prints a reminder to review it.

This is an unofficial student tool. Always confirm prerequisites with the Class Schedule or your advisor.
