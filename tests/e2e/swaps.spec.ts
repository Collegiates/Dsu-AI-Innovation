import { expect, test } from "@playwright/test";

test("Smart Swaps: shows cheaper swaps for the list, tries one, and hides a brand with undo", async ({ page }) => {
  await page.goto("/list");
  await page.getByRole("button", { name: "Load my usual list" }).click();
  await page.getByRole("button", { name: "Match my list" }).click();
  await expect(page.getByRole("region", { name: "Matched products" }).getByRole("listitem")).toHaveCount(16);

  await page.goto("/swaps");
  const rows = page.getByRole("listitem").filter({ hasText: "Try instead" });
  await expect(rows.first()).toBeVisible();
  const before = await rows.count();
  expect(before).toBeGreaterThan(0);
  // Every row has the code-computed weekly saving and an explanation sentence.
  await expect(rows.first().getByText(/a week · \d+% less/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Manage hidden brands/ })).toHaveAttribute("href", "/settings");

  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/swaps-1440x900.png` });

  // Hide the first suggestion's whole brand: the row disappears, and Undo brings it back.
  const firstLabel = (await rows.first().getAttribute("aria-label")) ?? "";
  await rows.first().getByRole("button", { name: /Never show again/ }).click();
  await page.getByRole("menuitem", { name: /^Everything from / }).click();
  await expect(page.getByRole("listitem", { name: firstLabel })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("listitem", { name: firstLabel })).toHaveCount(1);

  // "Try it" puts the suggestion on the list, so that swap is no longer offered.
  await page.getByRole("listitem", { name: firstLabel }).getByRole("button", { name: "Try it" }).click();
  await expect(page.getByRole("listitem", { name: firstLabel })).toHaveCount(0);
});
