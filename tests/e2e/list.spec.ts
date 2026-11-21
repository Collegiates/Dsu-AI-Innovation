import { expect, test } from "@playwright/test";

test("My List: load the demo list, match it, adjust it, and go to the trip plan", async ({ page }) => {
  await page.goto("/list");
  await expect(page.getByText("Your list is empty")).toBeVisible();

  await page.getByRole("button", { name: "Load my usual list" }).click();
  await page.getByRole("button", { name: "Match my list" }).click();

  const results = page.getByRole("region", { name: "Matched products" });
  await expect(results.getByRole("listitem")).toHaveCount(16);
  // Real products from the catalog, with a confidence label on every line.
  const milk = results.getByRole("listitem").filter({ hasText: "“2% milk”" });
  await expect(milk.getByText("Same product")).toBeVisible();
  await expect(milk.getByText(/2% Reduced Fat Milk/)).toBeVisible();
  // "rice" is rice, not crispy rice cereal.
  await expect(results.getByRole("listitem").filter({ hasText: "“rice”" }).getByText(/White Rice/)).toBeVisible();

  await page.getByRole("button", { name: "One more 2% milk" }).click();
  await expect(page.getByRole("group", { name: "Quantity of 2% milk" })).toContainText("2");

  await page.getByRole("button", { name: "Move toothpaste to Deal Watch" }).click();
  await expect(results.getByRole("listitem")).toHaveCount(15);

  // The list survives a reload because it is saved in the browser.
  await page.reload();
  await expect(results.getByRole("listitem")).toHaveCount(15);
  await expect(page.getByText(/Online prices from aldi\.us and walmart\.com/)).toBeVisible();

  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/list-1440x900.png` });

  await page.getByRole("link", { name: /build my trip plan/i }).click();
  await expect(page).toHaveURL(/\/trip$/);
});
