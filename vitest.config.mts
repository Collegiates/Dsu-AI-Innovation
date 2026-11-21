import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));
const serverOnlyStub = fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url));

/**
 * Test runner setup, split into three groups so each npm script runs only its own tests:
 * - unit: tests next to the code in src/ (npm test)
 * - eval: AI accuracy golden sets in tests/ai-eval/ (npm run eval)
 * - security: security checks in tests/security/ (npm run test:security)
 * Playwright end-to-end tests in tests/e2e/ are run separately (npm run test:e2e).
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": src,
      // The real "server-only" package throws outside a Next.js server, which would break tests of server code.
      "server-only": serverOnlyStub,
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "eval",
          include: ["tests/ai-eval/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "security",
          include: ["tests/security/**/*.test.ts"],
          environment: "node",
        },
      },
    ],
  },
});
