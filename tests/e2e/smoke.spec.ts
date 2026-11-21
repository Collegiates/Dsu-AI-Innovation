import { expect, test } from "@playwright/test";
import { APP_NAME } from "../../src/lib/config/app";

test("home page loads and shows the app name", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle(APP_NAME);
  await expect(page.getByRole("heading", { level: 1, name: APP_NAME })).toBeVisible();
});

test("home page is served with the security headers", async ({ page }) => {
  const response = await page.goto("/");
  const headers = response?.headers() ?? {};

  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBeTruthy();
});
