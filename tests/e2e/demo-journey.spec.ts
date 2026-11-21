import { expect, test, type Page } from "@playwright/test";
import { DEMO_FLAG_KEY } from "../../src/lib/auth/demo";

/**
 * The exact live-demo script, start to finish, with the internet cut off: any request that leaves localhost is
 * blocked, so this proves the demo survives bad wifi (DEMO_MODE=true is set by playwright.config.ts).
 */
test("demo journey, offline: list → trip → preference change → swaps → recalls → Deal Watch", async ({ page, context }) => {
  const blocked: string[] = [];
  await context.route(
    (url) => !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname),
    (route) => {
      blocked.push(route.request().url());
      return route.abort("internetdisconnected");
    },
  );
  await context.addInitScript((key) => localStorage.setItem(key, "true"), DEMO_FLAG_KEY);

  // 1. My List: load the demo list and see real matches with confidence labels.
  await page.goto("/list");
  await page.getByRole("button", { name: "Load demo list" }).click();
  await page.getByRole("button", { name: "Match my list" }).click();
  const matches = page.getByRole("region", { name: "Matched products" });
  await expect(matches.getByRole("listitem")).toHaveCount(16);
  await expect(matches.getByRole("listitem").filter({ hasText: "“2% milk”" }).getByText("Same product")).toBeVisible();

  // 2. Trip Plan: build it, then switch "Balance" → "Maximize savings" and see the plan change.
  await page.getByRole("link", { name: /build my trip plan/i }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await expect(page.getByRole("radio", { name: "Balance" })).toBeChecked();
  await expect(page.getByRole("article", { name: /^Stop 1:/ })).toBeVisible();
  const balancePlan = await planSummary(page);

  await page.getByText("Maximize savings").click();
  await expect(page.getByRole("radio", { name: "Maximize savings" })).toBeChecked();
  await expect.poll(() => planSummary(page)).not.toEqual(balancePlan);

  // 3. Smart Swaps: "Never show again" on one brand, and the row disappears.
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Smart Swaps" }).click();
  const rows = page.getByRole("listitem").filter({ hasText: "Try instead" });
  await expect(rows.first()).toBeVisible();
  const firstLabel = (await rows.first().getAttribute("aria-label")) ?? "";
  await rows.first().getByRole("button", { name: /Never show again/ }).click();
  await page.getByRole("menuitem", { name: /^Everything from / }).click();
  await expect(page.getByRole("listitem", { name: firstLabel })).toHaveCount(0);

  // 4. Recalls: check the list against the saved openFDA data (offline copy).
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Recalls & Safety" }).click();
  await page.getByRole("button", { name: "Check my list now" }).click();
  await expect(page.getByRole("status")).toContainText("Saved copy of openFDA data (offline)");
  // The catalog has no recalled product yet (the demo recall row hasn't been added to data/raw/products.csv),
  // so the honest result is "No possible matches". Once that row exists, assert the possible match here instead.
  await expect(page.getByText("No possible matches")).toBeVisible();

  // 5. Deal Watch: simulate next week and see 3 drops.
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Deal Watch" }).click();
  await page.getByRole("button", { name: "Load demo waitlist" }).click();
  await page.getByRole("button", { name: "Simulate next week's prices" }).click();
  await expect(page.getByRole("status")).toHaveText("3 of 4 waitlist items are deals next week.");

  // Nothing the demo needed came from the internet.
  expect(blocked).toEqual([]);
});

/** The stops and the trip total, as text, so two plans can be compared. */
async function planSummary(page: Page): Promise<string> {
  const stops = await page.getByRole("article", { name: /^Stop \d:/ }).evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
  const breakdown = await page.getByRole("region", { name: "Cost breakdown" }).innerText();
  return JSON.stringify({ stops, breakdown });
}
