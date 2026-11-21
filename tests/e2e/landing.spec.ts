import { expect, test } from "@playwright/test";
import { DEMO_FLAG_KEY } from "../../src/lib/auth/demo";

test("landing page loads at 1440x900 with the hero, how it works, the numbers, trust and a closing call to action", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Pay less at the stores you already shop at." })).toBeVisible();
  await expect(page.getByRole("img", { name: /DSU to Home/ })).toBeVisible();
  // The landing page has its own layout, without the app's sidebar.
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);

  // Everything in the hero, including the button, fits on the first 1440x900 screen.
  const button = page.getByRole("main").getByRole("link", { name: /Try the demo/ }).first();
  const box = await button.boundingBox();
  expect(box && box.y + box.height).toBeLessThanOrEqual(900);

  if (process.env.SCREENSHOT_DIR) {
    // Let the hero animation finish (about 3 seconds) before the screenshot.
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/landing-1440x900.png` });
    await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/landing-full.png`, fullPage: true });
  }

  for (const name of ["How it works", "By the numbers"]) await expect(page.getByRole("region", { name })).toBeAttached();
  await page.getByRole("region", { name: "By the numbers" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("region", { name: "By the numbers" }).getByText("88%").first()).toBeVisible();
  await expect(page.getByText("Code does the math.")).toBeVisible();
});

test("demo journey: landing → Try the demo → login → lands on /plan", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("main").getByRole("link", { name: /Try the demo/ }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Demo account — no sign-up needed.")).toBeVisible();

  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/login-1440x900.png` });

  await page.getByRole("button", { name: "Continue as James (demo)" }).click();
  await expect(page).toHaveURL(/\/plan$/);
  expect(await page.evaluate((key) => localStorage.getItem(key), DEMO_FLAG_KEY)).toBe("true");
});

test("regression: the demo login landed on a missing /plan page instead of the dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as James (demo)" }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByRole("heading", { level: 1, name: "This week" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
});

test("settings sends visitors without the demo login back to the landing page", async ({ page }) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Pay less at the stores you already shop at." })).toBeVisible();
});

test("sidebar links to every page, and the current page is marked", async ({ page }) => {
  await page.goto("/list");
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const name of ["Dashboard", "My List", "Trip Plan", "Smart Swaps", "Deal Watch", "Recalls & Safety", "Settings"]) {
    await expect(nav.getByRole("link", { name })).toBeVisible();
  }
  await expect(nav.getByRole("link", { name: "My List" })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Deal Watch" }).click();
  await expect(page).toHaveURL(/\/deals$/);
  await expect(nav.getByRole("link", { name: "Deal Watch" })).toHaveAttribute("aria-current", "page");
});
