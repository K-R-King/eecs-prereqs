import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Automated accessibility check (axe): fails on serious or critical problems such as
// unreadable contrast, controls without labels, or broken ARIA.

async function problems(page: Page) {
  // let fade-ins finish first: half-faded text would fail the contrast check (looping animations never end)
  await page.evaluate(() =>
    Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished)),
  );
  const results = await new AxeBuilder({ page })
    // the floating course tags in the header are decorative and hidden from screen readers
    .exclude("header .pointer-events-none")
    .analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target.join(" ")}`);
}

test("the home page has no serious accessibility problems", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
  expect(await problems(page)).toEqual([]);
});

// taken courses, readiness marks and the "next term" panel, in light and dark
for (const colorScheme of ["light", "dark"] as const) {
  test(`what you can take next term has no serious accessibility problems (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/?taken=CS61A.CS61B.CS70#next");
    await expect(page.getByRole("heading", { name: /What you can take next/ })).toBeVisible();
    expect(await problems(page)).toEqual([]);
  });
}
