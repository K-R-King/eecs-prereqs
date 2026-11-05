import { describe, expect, it } from "vitest";
import { COURSES, UNLOCKS, availableIn, missingGroups, upcomingTerm, withImplied } from "@/lib/courses";

const codes = (term: "Fall" | "Spring" | "Summer", taken: string[]) => availableIn(term, new Set(taken)).map((c) => c.code);

describe("upcomingTerm", () => {
  it("is Spring from August and Fall before", () => {
    expect(upcomingTerm(new Date(2026, 10, 4))).toBe("Spring");
    expect(upcomingTerm(new Date(2026, 7, 1))).toBe("Spring");
    expect(upcomingTerm(new Date(2027, 2, 15))).toBe("Fall");
    expect(upcomingTerm(new Date(2027, 6, 31))).toBe("Fall");
  });
});

describe("withImplied", () => {
  it("counts the single-option prerequisites of what you've taken", () => {
    const done = withImplied(new Set(["CS61B"]));
    expect(done.has("CS61B")).toBe(true);
    for (const group of COURSES.CS61B.prereqs) if (group.length === 1) expect(done.has(group[0])).toBe(true);
  });

  it("doesn't guess between options", () => {
    const either = Object.values(COURSES).find((c) => c.prereqs.some((g) => g.length > 1))!;
    const done = withImplied(new Set([either.code]));
    for (const group of either.prereqs.filter((g) => g.length > 1)) {
      expect(group.every((c) => !done.has(c) || COURSES[either.code].prereqs.some((g) => g.length === 1 && withImplied(new Set(g)).has(c)))).toBe(true);
    }
  });
});

describe("availableIn", () => {
  it("only lists courses you're ready for, offered that term, and not done", () => {
    const taken = ["CS61A", "CS61B", "CS70", "MATH51", "MATH52"];
    const done = withImplied(new Set(taken));
    for (const term of ["Fall", "Spring", "Summer"] as const) {
      for (const code of codes(term, taken)) {
        const c = COURSES[code];
        expect(done.has(code), code).toBe(false);
        expect(c.terms, code).toContain(term);
        expect(missingGroups(c, done), code).toEqual([]);
      }
    }
  });

  it("opens up CS 170 once CS 61B and CS 70 are done", () => {
    const term = COURSES.CS170.terms![0] as "Fall" | "Spring" | "Summer";
    expect(codes(term, ["CS61A"])).not.toContain("CS170");
    expect(codes(term, ["CS61B", "CS70"])).toContain("CS170");
  });

  it("doesn't suggest prerequisites of courses you've taken", () => {
    expect(codes("Fall", ["CS61B"])).not.toContain("CS61A");
  });

  it("skips lab versions of what you've taken and courses that only finish one started elsewhere", () => {
    const list = availableIn("Spring", new Set(["CS61A", "CS61B", "CS70"]));
    expect(list.map((c) => c.code)).not.toContain("CS61BL");
    expect(list.filter((c) => /^completion of work/i.test(c.title))).toEqual([]);
  });

  it("lists EECS courses first, then the ones that unlock the most", () => {
    const list = availableIn("Fall", new Set(["CS61A", "CS61B", "CS70"]));
    const firstOutside = list.findIndex((c) => c.outside);
    if (firstOutside >= 0) expect(list.slice(firstOutside).every((c) => c.outside)).toBe(true);
    const eecs = list.filter((c) => !c.outside).map((c) => UNLOCKS[c.code]?.length ?? 0);
    expect(eecs).toEqual([...eecs].sort((a, b) => b - a));
  });
});

describe("seminars and DeCals", () => {
  it("aren't suggested for next term (their requirements depend on the topic)", () => {
    expect(availableIn("Fall", new Set()).filter((c) => c.kind)).toEqual([]);
  });
});
