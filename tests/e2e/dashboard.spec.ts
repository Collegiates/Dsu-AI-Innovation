import { expect, test } from "@playwright/test";
import { DEMO_FLAG_KEY } from "../../src/lib/auth/demo";

test("dashboard (/plan) loads at 1440x900 with the savings hero, the trip block and the attention strip", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // The dashboard needs the demo login.
  await page.addInitScript((key) => localStorage.setItem(key, "true"), DEMO_FLAG_KEY);
  await page.goto("/plan");

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

  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/dashboard-1440x900.png` });
});

test("dashboard sends visitors without the demo login back to the landing page", async ({ page }) => {
  await page.goto("/plan");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Save on the drive you already make." })).toBeVisible();
});
