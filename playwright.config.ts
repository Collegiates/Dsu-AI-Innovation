import { defineConfig, devices } from "@playwright/test";

// Its own port, so a dev server you already have open on 3000 (with the real data) isn't reused by mistake.
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

/**
 * End-to-end test setup: opens the real app in Chromium at the demo laptop's screen size (1440×900)
 * and clicks through it like a user would. It starts the dev server on its own, in demo mode,
 * so the tests never depend on wifi. Example: npm run test:e2e
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Demo mode (no internet needed) and the e2e test data folder (real products, test detours).
    env: { DEMO_MODE: "true", GROCERYSAVE_DATA_DIR: "tests/e2e/fixture-data" },
  },
});
