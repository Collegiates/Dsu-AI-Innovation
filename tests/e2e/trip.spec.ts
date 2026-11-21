import { expect, test } from "@playwright/test";

test("Trip Plan: plans the matched list and re-plans instantly when the preference changes", async ({ page }) => {
  await page.goto("/trip");
  await expect(page.getByText("Nothing to plan yet")).toBeVisible();

  await page.goto("/list");
  await page.getByRole("button", { name: "Load demo list" }).click();
  await page.getByRole("button", { name: "Match my list" }).click();
  await expect(page.getByRole("region", { name: "Matched products" }).getByRole("listitem")).toHaveCount(16);
  await page.getByRole("link", { name: /build my trip plan/i }).click();

  await expect(page.getByRole("radio", { name: "Balance" })).toBeChecked();
  await expect(page.getByRole("article", { name: /^Stop 1:/ })).toBeVisible();
  const stopsAtBalance = await page.getByRole("article", { name: /^Stop \d:/ }).count();
  await expect(page.getByRole("img", { name: /Drive from DSU to Home/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Cost breakdown" }).getByText("Trip total")).toBeVisible();
  await expect(page.getByRole("region", { name: "Compare trips" }).getByRole("columnheader", { name: "Cheapest single store" })).toBeVisible();
  await expect(page.getByText(/Online prices from aldi\.us and walmart\.com/).filter({ visible: true })).toBeVisible();

  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/trip-1440x900.png` });

  // "Get home fastest" counts time at $1/min, so it never takes more stops than "Balance".
  await page.getByText("Get home fastest").click();
  await expect(page.getByRole("radio", { name: "Get home fastest" })).toBeChecked();
  expect(await page.getByRole("article", { name: /^Stop \d:/ }).count()).toBeLessThanOrEqual(stopsAtBalance);

  // The choice is remembered.
  await page.reload();
  await expect(page.getByRole("radio", { name: "Get home fastest" })).toBeChecked();
});
