# UC Berkeley EECS Prereqs

See what every undergraduate EECS course needs first, the full chain back to your first class, and what each course unlocks. A sister site to the [EECS Planner](https://eecs-planner.vercel.app), [EECS Electives](https://eecs-electives.vercel.app) and [EECS Links](https://eecs-links.vercel.app).

## Features

- **78 undergraduate CS, EE and EECS courses**, plus the 22 math, physics, statistics and other courses they build on or accept as alternatives.
- **Full prerequisite chain** for every course, drawn as a diagram from your first class to that course. Click any course in it to jump there.
- **What it unlocks:** every course that lists it as a prerequisite.
- **Ready to take it?** Mark the courses you've taken and every course shows whether you've met its prerequisites. Filter to "only what I can take". Saved in your browser.
- **Search and filters:** by code, name, or area (e.g. "machine learning"), lower or upper division, department, and related area. Press `/` to search, `Enter` to open the first match.
- **Shareable links:** `#CS170` at the end of the URL opens that course.
- The official prerequisite text on every course, with links to the Berkeley catalog and the EECS course page, and a note wherever those sources disagree.
- Light and dark mode, and a layout that works on phones.

## Running locally

```bash
npm install
npm run dev
```

Open `http://localhost:3002`. It uses port 3002 so it can run next to the other sites (planner 3000, links 3001, electives 3003); in development the switcher points to those.

## Course data

`data/courses.json` is built from two official sources:

```bash
python scripts/fetch_courses.py         # EECS course pages -> data/courses.json
npx playwright install chromium         # once
node scripts/fetch_catalog.mjs          # Berkeley catalog  -> data/catalog.json
python scripts/fetch_courses.py         # again, to use the catalog's wording and check against it
```

- **[EECS department course pages](https://www2.eecs.berkeley.edu/Courses/):** every undergraduate course on the CS and EE lists (skipping seminars, DeCals, special topics and independent study), with its title, units, terms, related areas, weekly class hours and description.
- **[Berkeley undergraduate catalog](https://undergraduate.catalog.berkeley.edu/):** the registrar's current prerequisite wording, and structured rules for many courses. Its data service only answers requests from the catalog site, so `fetch_catalog.mjs` opens the public catalog in a headless browser and runs the same lookups the site does.

The official wording varies too much to read reliably by machine, so each course's prerequisites were read by hand and written into `MANUAL` in `fetch_courses.py`. Each course has a list of requirements, and any one course in a requirement meets it. Every run compares `MANUAL` with the catalog's structured rules and prints anything it doesn't account for.

Some things are left out of the diagram but still appear in the official text on each course:

- recommended courses and "consent of instructor";
- courses already implied by another requirement (Math 51 when Math 52 is required);
- alternatives that are retired or not in the catalog (e.g. EE 40, CS 9D).

Where the sources disagree (e.g. EE 121's text says CS 170 but its rule says CS 70), the course shows a note. New courses fall back to a best-effort parse and are flagged for review.

The data is also served at [`/courses.json`](https://eecs-prereqs.vercel.app/courses.json), which EECS Electives syncs from.

This is an unofficial student tool. Always confirm prerequisites with the Class Schedule or your advisor.
