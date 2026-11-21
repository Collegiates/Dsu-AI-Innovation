import { expect, test } from "@playwright/test";

test("Recalls & Safety: checks the list against FDA recalls and says when and from where", async ({ page }) => {
  await page.goto("/recalls");
  await expect(page.getByText("No list to check yet")).toBeVisible();

  await page.goto("/list");
  await page.getByRole("button", { name: "Load demo list" }).click();
  await page.getByRole("button", { name: "Match my list" }).click();
  await expect(page.getByRole("region", { name: "Matched products" }).getByRole("listitem")).toHaveCount(16);

  await page.goto("/recalls");
  await expect(page.getByText("Not checked yet")).toBeVisible();
  await page.getByRole("button", { name: "Check my list now" }).click();

  // The tests run in demo mode, so the saved copy of real openFDA data is used, and the page says so.
  await expect(page.getByRole("status")).toContainText(/Last checked .* against [\d,]+ FDA food recalls/);
  await expect(page.getByRole("status")).toContainText("Saved copy of openFDA data (offline)");
  // The real catalog has no recalled products today, so the result is a calm "no matches" (never a made-up alarm).
  await expect(page.getByText("No possible matches")).toBeVisible();

  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/recalls-1440x900.png` });
});

test("Settings: shows the route and stores, saves the default preference, and un-hides brands", async ({ page }) => {
  await page.goto("/settings");
  const stores = page.getByRole("region", { name: "Stores on your route" });
  await expect(stores.getByText("Walmart", { exact: true })).toBeVisible();
  await expect(stores.getByText("On your route", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Commute" })).toContainText("DSU → Home");
  await expect(page.getByText("No hidden brands.")).toBeVisible();

  await page.getByRole("region", { name: "Default trip preference" }).getByText("Maximize savings").click();
  await expect(page.getByRole("radio", { name: "Maximize savings" })).toBeChecked();

  // Hide a brand on Smart Swaps, then show it again from Settings.
  await page.evaluate(() => localStorage.setItem("grocerysave:hiddenBrands", JSON.stringify(["Equate"])));
  await page.reload();
  await expect(page.getByRole("list", { name: "Hidden brands" })).toContainText("Equate");

  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/settings-1440x900.png` });

  await page.getByRole("button", { name: "Show Equate again" }).click();
  await expect(page.getByText("No hidden brands.")).toBeVisible();

  // The default preference carries over to the Trip Plan.
  await page.goto("/trip");
  await page.goto("/settings");
  await expect(page.getByRole("radio", { name: "Maximize savings" })).toBeChecked();
});
