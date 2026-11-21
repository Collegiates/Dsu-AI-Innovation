import { expect, test } from "@playwright/test";

test("dashboard loads at 1440x900 with the savings hero, the trip block and the attention strip", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const hero = page.getByRole("region", { name: /you save|best value/i });
  await expect(hero).toBeVisible();
  await expect(hero.getByText(/Typical \(usual products, usual store\)/)).toBeVisible();
  await expect(hero.getByRole("link", { name: "View trip plan" })).toHaveAttribute("href", "/trip");

  const trip = page.getByRole("region", { name: "Recommended trip" });
  await expect(trip).toBeVisible();
  await expect(trip.getByRole("img", { name: /Drive from DSU to Home/ })).toBeVisible();
  await expect(trip.getByText("Extra time")).toBeVisible();

  await expect(page.getByRole("region", { name: "Needs your attention" })).toBeVisible();
  await expect(page.getByText(/Online prices from aldi\.us and walmart\.com/)).toBeVisible();

  // Everything important fits on one 1440x900 screen without scrolling.
  const attentionBox = await page.getByRole("region", { name: "Needs your attention" }).boundingBox();
  expect(attentionBox && attentionBox.y + attentionBox.height).toBeLessThanOrEqual(900);

  if (process.env.SCREENSHOT_PATH) await page.screenshot({ path: process.env.SCREENSHOT_PATH, fullPage: false });
});

test("sidebar links to every page, and the current page is marked", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const name of ["Dashboard", "My List", "Trip Plan", "Smart Swaps", "Deal Watch", "Recalls & Safety", "Settings"]) {
    await expect(nav.getByRole("link", { name })).toBeVisible();
  }
  await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Deal Watch" }).click();
  await expect(page).toHaveURL(/\/deals$/);
  await expect(nav.getByRole("link", { name: "Deal Watch" })).toHaveAttribute("aria-current", "page");
});
