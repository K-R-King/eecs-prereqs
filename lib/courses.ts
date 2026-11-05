import data from "@/data/courses.json";

export type Course = {
  code: string;
  display: string;
  title: string;
  units?: string | null;
  terms?: string[];
  areas?: string[];
  description?: string;
  prereq_text?: string;
  // every group is required; any one course in a group meets it
  prereqs: string[][];
  // groups that may also be taken the same term
  coreqs: string[][];
  // the EECS department's course page, and the course in Berkeley's catalog
  source?: string | null;
  catalog_source?: string;
  // where the official sources disagree
  note?: string;
  // hours per week in lecture, discussion and lab
  class_hours?: number | null;
  outside?: boolean;
  // seminars, DeCals and special topics: one entry per number, whose topic changes every term
  kind?: Kind;
};

export type Kind = "seminar" | "decal" | "topics";
export const KIND_LABELS: Record<Kind, string> = { seminar: "Seminar", decal: "DeCal", topics: "Special topics" };

/** A student-run course this semester (from berkeleydecal.com); they're taken as CS or EE 98/198. */
export type Decal = {
  title: string;
  units: string | null;
  department: string;
  description: string;
  website: string | null;
  apply: string | null;
};
export const DECALS = (data as { decals?: { semester: string; source: string; courses: Decal[] } | null }).decals ?? null;

export const CHECKED: string = data.checked;
export const EECS_COURSES = Object.values(data.courses) as Course[];
export const OUTSIDE_COURSES = Object.values(data.outside) as Course[];
export const COURSES: Record<string, Course> = Object.fromEntries(
  [...EECS_COURSES, ...OUTSIDE_COURSES].map((c) => [c.code, c]),
);

export const number = (c: Course) => parseInt(c.code.match(/\d+/)?.[0] ?? "0", 10);
export const dept = (c: Course) => (c.outside ? "Other" : c.display.split(" ")[0]);
export const isUpper = (c: Course) => number(c) >= 100;

export const byCode = (a: Course, b: Course) =>
  dept(a).localeCompare(dept(b)) || number(a) - number(b) || a.code.localeCompare(b.code);

// course -> the courses that list it as a prerequisite or corequisite
export const UNLOCKS: Record<string, string[]> = {};
for (const c of Object.values(COURSES)) {
  for (const code of new Set([...c.prereqs, ...c.coreqs].flat())) {
    (UNLOCKS[code] ??= []).push(c.code);
  }
}

export const PREREQ_LINKS = Object.values(UNLOCKS).reduce((n, list) => n + list.length, 0);

// every group has a course you've taken (corequisites can be taken alongside, so they don't block)
export function missingGroups(c: Course, taken: Set<string>) {
  return c.prereqs.filter((g) => !g.some((code) => taken.has(code)));
}

export function matches(c: Course, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const compact = q.replace(/\s+/g, "");
  return (
    c.code.toLowerCase().includes(compact) ||
    c.display.toLowerCase().includes(q) ||
    c.title.toLowerCase().includes(q) ||
    (c.areas ?? []).some((a) => a.toLowerCase().includes(q)) ||
    (!!c.kind && KIND_LABELS[c.kind].toLowerCase().includes(q))
  );
}

// ---------- what you can take next term ----------

export type Term = "Fall" | "Spring" | "Summer";
export const TERMS: Term[] = ["Fall", "Spring", "Summer"];

/** The term students are choosing classes for: Spring from August (it's enrolled in the fall), else Fall. */
export function upcomingTerm(date = new Date()): Term {
  return date.getMonth() >= 7 ? "Spring" : "Fall";
}

/**
 * Having taken a course means you met its prerequisites, so count those as done too (CS 61B covers
 * CS 61A). For "any one of" requirements we can't know which, so none of them are added.
 */
export function withImplied(taken: Set<string>) {
  const done = new Set<string>();
  const visit = (code: string) => {
    if (done.has(code) || !COURSES[code]) return;
    done.add(code);
    for (const group of COURSES[code].prereqs) if (group.length === 1) visit(group[0]);
  };
  taken.forEach(visit);
  return done;
}

/**
 * Courses you could take in `term`: not done, every prerequisite met, and offered that term recently.
 * EECS courses first, then the ones that open up the most other courses.
 */
export function availableIn(term: Term, taken: Set<string>): Course[] {
  const done = withImplied(taken);
  // any option toward a course you've taken is behind you (CS 61A when you've taken CS 61B), even
  // though it doesn't count as done for other courses
  const behind = new Set([...done].flatMap((code) => COURSES[code].prereqs.flat()));
  // and the lab version of a course you've taken (CS 61BL after CS 61B)
  for (const code of done) behind.add(`${code}L`);
  return Object.values(COURSES)
    .filter((c) => !done.has(c.code) && !behind.has(c.code))
    // seminars, DeCals and special topics have their own filter: their requirements depend on the topic
    .filter((c) => !c.kind)
    // "Completion of work in CS 61A" and the like only finish a course started elsewhere (e.g. transfers)
    .filter((c) => !/^completion of work/i.test(c.title))
    .filter((c) => (c.terms ?? []).includes(term) && missingGroups(c, done).length === 0)
    .sort((a, b) =>
      Number(!!a.outside) - Number(!!b.outside) ||
      (UNLOCKS[b.code]?.length ?? 0) - (UNLOCKS[a.code]?.length ?? 0) ||
      byCode(a, b));
}
