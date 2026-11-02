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
};

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
    (c.areas ?? []).some((a) => a.toLowerCase().includes(q))
  );
}
