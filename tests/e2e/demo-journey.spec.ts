import { expect, test } from "@playwright/test";

/**
 * The exact live-demo script, start to finish, with the internet cut off: any request that leaves localhost is
 * blocked, so this proves the demo survives bad wifi (DEMO_MODE=true is set by playwright.config.ts).
 * landing → login → /plan → pick Walmart + ALDI → load James's list → results → swap chip → recall banner → Recalls → Deal Watch.
 */
test("demo journey, offline: landing → login → stores → list → trip results → swap chip → recall banner", async ({ page, context }) => {
  const blocked: string[] = [];
  await context.route(
    (url) => !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname),
    (route) => {
      blocked.push(route.request().url());
      return route.abort("internetdisconnected");
    },
  );

  // 1. Landing → login → /plan.
  await page.goto("/");
  await page.getByRole("main").getByRole("link", { name: /Try the demo/ }).first().click();
  await page.getByRole("button", { name: "Continue as James (demo)" }).click();
  await expect(page).toHaveURL(/\/plan$/);

  // 2. Pick the stores: Walmart and ALDI (checked by default); Food Lion and Target have no prices yet.
  const stores = page.getByRole("region", { name: "Your stores" });
  const walmart = stores.getByRole("checkbox", { name: /Walmart/ });
  const aldi = stores.getByRole("checkbox", { name: /ALDI/ });
  await expect(walmart).toBeChecked();
  await expect(aldi).toBeChecked();
  await expect(stores.getByRole("checkbox", { name: /Food Lion/ })).toBeDisabled();
  await expect(stores.getByRole("checkbox", { name: /Target/ })).toBeDisabled();
  await expect(stores.getByText("Prices coming soon")).toHaveCount(2);
  await aldi.uncheck();
  await aldi.check();
  await expect(aldi).toBeChecked();

  // 3. Load James's list and match it.
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "My List" }).click();
  await page.getByRole("button", { name: "Load demo list" }).click();
  await page.getByRole("button", { name: "Match my list" }).click();
  const matches = page.getByRole("region", { name: "Matched products" });
  // The first match request can take a few seconds while the dev server compiles the route.
  await expect(matches.getByRole("listitem")).toHaveCount(16, { timeout: 20_000 });
  await expect(matches.getByRole("listitem").filter({ hasText: "“2% milk”" }).getByText("Same product")).toBeVisible();

  // 4. Results: "Shop at …: $X" with the other store's total beside it, and no detour, gas or commute text.
  await page.getByRole("link", { name: /build my trip plan/i }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await expect(page.getByRole("heading", { level: 2, name: /^Shop at .+: \$\d+\.\d\d$/ })).toBeVisible();
  await expect(page.getByRole("list", { name: "Other stores" })).toContainText(/only: \$\d+\.\d\d/);
  await expect(page.getByRole("main")).not.toContainText(/\+\d+ min|\d mi\b|gas|detour|on your route|commute/i);

  // 5. Swap chip: items bought as a cheaper swap show the saving and link to Smart Swaps.
  const chip = page.getByRole("link", { name: /^Cheaper swap: save \$\d+\.\d\d$/ }).first();
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute("href", "/swaps");

  // 6. Recall banner on the results, and the full example on Recalls & Safety.
  const banner = page.getByRole("note", { name: "Recall alert" });
  await expect(banner).toContainText("Possible recall in your past purchases");
  await expect(banner).toContainText("No recall matches for this week's list.");
  await banner.getByRole("link", { name: "check the lot code" }).click();
  await expect(page).toHaveURL(/\/recalls$/);
  const pastRecall = page.getByRole("region", { name: "Great Value Organic Triple Berry Blend, 10 oz" });
  await expect(pastRecall).toContainText("National recall example: hypothetical past purchase; not listed for Delaware.");
  await expect(pastRecall).toContainText("6040 01-6");
  await page.getByRole("button", { name: "Check my list now" }).click();
  await expect(page.getByRole("status")).toContainText("Saved copy of openFDA data (offline)");
  await expect(page.getByText("No recall matches for this week's list", { exact: true })).toBeVisible();

  // 7. Deal Watch: simulate next week and see 3 drops.
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Deal Watch" }).click();
  await page.getByRole("button", { name: "Load demo waitlist" }).click();
  await page.getByRole("button", { name: "Simulate next week's prices" }).click();
  await expect(page.getByRole("status")).toHaveText("3 of 4 waitlist items are deals next week.");

  // Nothing the demo needed came from the internet.
  expect(blocked).toEqual([]);
});
