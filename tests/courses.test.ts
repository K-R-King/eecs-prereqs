import { describe, expect, it } from "vitest";
import { COURSES, UNLOCKS, matches, missingGroups } from "@/lib/courses";

const all = Object.values(COURSES);

describe("course data", () => {
  it("only lists prerequisites that are courses on the site", () => {
    const unknown = all.flatMap((c) => [...c.prereqs, ...c.coreqs].flat().filter((code) => !COURSES[code]).map((code) => `${c.code} -> ${code}`));
    expect(unknown).toEqual([]);
  });

  it("has no empty groups and no course that requires itself", () => {
    for (const c of all) {
      for (const group of [...c.prereqs, ...c.coreqs]) expect(group.length, c.code).toBeGreaterThan(0);
      expect(c.prereqs.flat(), c.code).not.toContain(c.code);
    }
  });

  it("has no prerequisite loops", () => {
    const state: Record<string, "visiting" | "done"> = {};
    const visit = (code: string, path: string[]) => {
      if (state[code] === "done") return;
      if (state[code] === "visiting") throw new Error(`loop: ${[...path, code].join(" -> ")}`);
      state[code] = "visiting";
      for (const next of COURSES[code].prereqs.flat()) visit(next, [...path, code]);
      state[code] = "done";
    };
    for (const c of all) visit(c.code, []);
  });

  it("lists what each course unlocks, the reverse of its prerequisites", () => {
    for (const [code, unlocked] of Object.entries(UNLOCKS)) {
      for (const other of unlocked) expect([...COURSES[other].prereqs, ...COURSES[other].coreqs].flat(), `${code} -> ${other}`).toContain(code);
    }
  });
});

describe("missingGroups", () => {
  it("needs one course from every group", () => {
    const c = all.find((x) => x.prereqs.length >= 2)!;
    expect(missingGroups(c, new Set())).toHaveLength(c.prereqs.length);
    expect(missingGroups(c, new Set(c.prereqs.map((g) => g[g.length - 1])))).toEqual([]);
    expect(missingGroups(c, new Set([c.prereqs[0][0]]))).toHaveLength(c.prereqs.length - 1);
  });
});

describe("search", () => {
  it("finds courses by code with or without a space, by title, and matches everything when empty", () => {
    expect(matches(COURSES.CS170, "cs 170")).toBe(true);
    expect(matches(COURSES.CS170, "CS170")).toBe(true);
    expect(matches(COURSES.CS170, COURSES.CS170.title.slice(0, 8))).toBe(true);
    expect(matches(COURSES.CS170, "  ")).toBe(true);
    expect(matches(COURSES.CS170, "zzzz")).toBe(false);
  });
});
