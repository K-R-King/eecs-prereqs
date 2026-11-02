// Fetch the official requisites for every course from Berkeley's undergraduate catalog
// (undergraduate.catalog.berkeley.edu) into data/catalog.json, to check the hand-reviewed
// prerequisites in fetch_courses.py against.
//
// The catalog's data service only answers requests made from the catalog site, so this opens
// the public catalog in a headless browser and runs the same lookups the site itself does.
//
// Usage (from the project root, after fetch_courses.py):  node scripts/fetch_catalog.mjs

import { chromium } from "@playwright/test";
import fs from "node:fs";

const ROOT = new URL("..", import.meta.url);
const FILTERS = JSON.parse(fs.readFileSync(new URL("scripts/catalog-filters.json", ROOT), "utf8"));
const COURSES = JSON.parse(fs.readFileSync(new URL("data/courses.json", ROOT), "utf8"));
const OUTPUT = new URL("data/catalog.json", ROOT);

// our prefixes -> the catalog's subject codes
const SUBJECTS = { CS: "COMPSCI", EE: "ELENG", EECS: "EECS", MATH: "MATH", PHYS: "PHYSICS", STAT: "STAT", DATA: "DATA",
  ENGIN: "ENGIN", INFO: "INFO", CHEM: "CHEM" };
// courses we name differently from the catalog
const RENAMED = { DATA8: "DATA C8", EEC106A: "EECS C106A", EEC106B: "EECS C106B", EEC145B: "EECS C145B",
  EEC145L: "EECS C145L", EEC145O: "EECS C145O" };
// alternatives named in prerequisite text that have no EECS page
const EXTRA = ["STAT20", "ENGIN7", "PHYS89", "PHYS137A", "CHEM120A", "MATH10A", "MATH16A", "MATH74", "INFO206B", "INFO251", "DATA144"];

function catalogCode(code) {
  if (RENAMED[code]) return RENAMED[code];
  const m = code.match(/^([A-Z]+?)(C?\d+[A-Z]*)$/);
  return m && SUBJECTS[m[1]] ? `${SUBJECTS[m[1]]} ${m[2]}` : null;
}

const codes = [...Object.keys(COURSES.courses), ...Object.keys(COURSES.outside), ...EXTRA];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("https://undergraduate.catalog.berkeley.edu/courses", { waitUntil: "networkidle" });

const result = await page.evaluate(async ({ FILTERS, wanted }) => {
  const API = "https://app.coursedog.com/api/v1/cm/ucberkeley_peoplesoft/courses/search/";
  const HEADERS = { "x-requested-with": "catalog", accept: "application/json", "content-type": "application/json" };
  const DATES = `effectiveDatesRange=${new Date().toISOString().slice(0, 10)}%2C${new Date().toISOString().slice(0, 10)}`;
  const post = async (url, body) => (await fetch(url, { method: "POST", headers: HEADERS, body: JSON.stringify(body) })).json();

  const found = {};
  const ids = new Set();
  for (const [ours, theirs] of wanted) {
    const search = await post(
      `${API}${encodeURIComponent(theirs)}?catalogId=hMSTjIplK6VX5nnJn7ZE&skip=0&limit=20&orderBy=code&formatDependents=false&${DATES}&ignoreEffectiveDating=false&ignoreTotalCount=false&columns=code%2CcourseGroupId`,
      { condition: "AND", filters: [{ filters: FILTERS, id: "search", condition: "and" }] },
    );
    const hit = (search.data ?? []).find((c) => c.code === theirs.replace(" ", ""));
    if (!hit) continue;
    const detail = await post(
      `${API}$filters?courseGroupIds=${hit.courseGroupId}&${DATES}&formatDependents=false&includeRelatedData=true&includeCrosslisted=true&includePending=false&returnResultsWithTotalCount=false`,
      { filters: FILTERS, id: "detail", condition: "and" },
    );
    const course = detail.data?.[0];
    if (!course) continue;
    JSON.stringify(course.requisites ?? {}).replace(/"(\d{6,8})"/g, (_, id) => ids.add(id));
    found[ours] = { catalogCode: theirs, title: course.longName || course.name, requisites: course.requisites?.requisitesSimple ?? [] };
  }

  // the rules name courses by id; look up their codes
  const names = await post(
    `${API}%24filters?catalogId=hMSTjIplK6VX5nnJn7ZE&skip=0&limit=1000&orderBy=&formatDependents=false&${DATES}&ignoreEffectiveDating=false&ignoreTotalCount=false&columns=code%2CcourseGroupId`,
    { filters: FILTERS, id: "names", condition: "and", courseGroupIds: [...ids] },
  );
  return { found, idToCode: Object.fromEntries((names.data ?? []).map((c) => [c.courseGroupId, c.code])) };
}, { FILTERS, wanted: codes.map((c) => [c, catalogCode(c)]).filter(([, c]) => c) });

await browser.close();

// flatten each course's rules into readable form: groups of catalog codes, or the rule's text
const catalog = {};
for (const [code, c] of Object.entries(result.found)) {
  catalog[code] = {
    catalogCode: c.catalogCode,
    title: c.title,
    rules: c.requisites.flatMap((block) =>
      (block.rules ?? []).map((r) => ({
        type: block.type,
        condition: r.condition,
        text: r.condition === "freeformText" ? r.value : r.name,
        notes: r.notes || undefined,
        groups: (r.value?.values ?? []).map((v) => ({
          logic: v.logic,
          courses: (v.value ?? []).map((id) => result.idToCode[id] ?? `unknown:${id}`),
        })),
      })),
    ),
  };
}

fs.writeFileSync(OUTPUT, JSON.stringify({ checked: new Date().toISOString().slice(0, 10), courses: catalog }, null, 2) + "\n");
const missing = codes.filter((c) => !catalog[c]);
console.log(`Wrote ${Object.keys(catalog).length} courses to data/catalog.json${missing.length ? `; not in the catalog: ${missing.join(", ")}` : ""}`);
