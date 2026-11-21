import { expect, test } from "@playwright/test";

test("Deal Watch: load the demo waitlist, simulate next week, and see the drops highlighted", async ({ page }) => {
  await page.goto("/deals");
  await expect(page.getByText("Your waitlist is empty")).toBeVisible();
  await page.getByRole("button", { name: "Load demo waitlist" }).click();

  const rows = page.getByRole("main").getByRole("listitem");
  await expect(rows).toHaveCount(4);
  await expect(page.getByLabel(/^Target price for .*Paper Towels/)).toHaveValue("7.50");
  await expect(page.getByText(/alerts are sent by email/)).toBeVisible();

  await page.getByRole("button", { name: "Simulate next week's prices" }).click();
  await expect(page.getByText("Showing simulated prices for next week")).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("3 of 4 waitlist items are deals next week.");

  // Tide Free & Gentle: $14.29 → $11.99 (simulated) at ALDI, 16% less; the old price is struck through.
  const tide = rows.filter({ hasText: "Tide" });
  await expect(tide.locator("s")).toHaveText("$14.29");
  await expect(tide.getByText("$11.99")).toBeVisible();
  await expect(tide.getByText(/16% less at ALDI/)).toBeVisible();
  await expect(rows.filter({ hasText: "Shampoo" }).getByText("No drop next week")).toBeVisible();
  // Paper towels are a deal because they're under the $7.50 target, not because the price fell, so nothing is struck through.
  const towels = rows.filter({ hasText: "Paper Towels" });
  await expect(towels.getByText(/at or under your target/)).toBeVisible();
  await expect(towels.locator("s")).toHaveCount(0);

  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/deals-1440x900.png` });

  await page.getByRole("button", { name: "Back to this week's prices" }).click();
  await expect(tide.getByText("Best price today")).toBeVisible();
});
