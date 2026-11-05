// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

// lib/handoff.ts is the same file in all five EECS sites; it's tested here
async function load(url: string) {
  window.history.replaceState(null, "", url);
  vi.resetModules(); // takeIncoming reads the address once per page load
  return import("@/lib/handoff");
}

beforeEach(() => window.localStorage.clear());

describe("taken courses between the EECS sites", () => {
  it("reads ?taken= once, removes it from the address bar and remembers it", async () => {
    const h = await load("/?taken=CS61A.cs61b.bad-code.CS61A#CS170");
    expect(h.takeIncoming()).toEqual(["CS61A", "CS61B"]);
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("#CS170");
    expect(h.takeIncoming()).toEqual(["CS61A", "CS61B"]);
    expect(h.rememberedTaken()).toEqual(["CS61A", "CS61B"]);
  });

  it("returns null without a list, and adds to what was remembered", async () => {
    let h = await load("/");
    expect(h.takeIncoming()).toBeNull();
    h.rememberTaken(["CS70"]);
    h = await load("/?taken=CS61A");
    h.takeIncoming();
    expect(h.rememberedTaken()).toEqual(["CS70", "CS61A"]);
  });

  it("adds the list only to links to the sister sites", async () => {
    const h = await load("/");
    h.rememberTaken(["CS61A", "CS70"]);
    expect(h.withTaken("https://eecs-electives.vercel.app/#i=ai")).toBe("https://eecs-electives.vercel.app/?taken=CS61A.CS70#i=ai");
    expect(h.withTaken("https://calcentral.berkeley.edu/")).toBe("https://calcentral.berkeley.edu/");
    expect(h.withTaken("/#CS170")).toBe("/#CS170");
  });

  it("removes a stale list from a link once nothing is taken", async () => {
    const h = await load("/");
    expect(h.withTaken("https://eecs-hub.vercel.app/?taken=CS61A")).toBe("https://eecs-hub.vercel.app/");
  });

  it("survives blocked or corrupt storage", async () => {
    const h = await load("/");
    window.localStorage.setItem("eecs-suite:taken", "{not json");
    expect(h.rememberedTaken()).toEqual([]);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => h.rememberTaken(["CS61A"])).not.toThrow();
    vi.restoreAllMocks();
  });
});
