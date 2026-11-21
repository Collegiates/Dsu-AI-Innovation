# Testing

How to run the tests, test counts per feature, and the list of regression tests.

## How to run

| Command | What it runs |
|---|---|
| `npm run check` | typecheck + lint + unit tests + AI eval + security tests (must pass before every commit) |
| `npm test` | unit and component tests next to the code in `src/` |
| `npm run eval` | AI golden set in `tests/ai-eval/` (fails below 90% accuracy) |
| `npm run test:security` | security tests in `tests/security/` (includes a real `next build`, about 15 seconds) |
| `npm run test:e2e` | Playwright journeys in `tests/e2e/` (Chromium, 1440×900, starts its own dev server on port 3100 in demo mode with the test data in `tests/e2e/fixture-data/`) |
| `npm run report` | test counts per folder, regression tests, e2e journeys, latest AI eval accuracy |

The AI eval saves its latest score to `tests/ai-eval/latest-result.json` (git-ignored, rewritten on every run), which `npm run report` reads.
To refresh the screenshots in `docs/screenshots/`, run `SCREENSHOT_DIR=docs/screenshots npm run test:e2e`.

## Test counts (Nov 21, 2026)

`npm run check`: **249 tests, all passing**. `npm run test:e2e`: **16 journeys, all passing** (including the full demo journey with the internet blocked).

| Feature | Unit / component tests (folder) | Count | End-to-end |
|---|---|---|---|
| Trip optimizer | `src/lib/trip`, `src/components/trip` | 24 + 5 | `trip.spec.ts` |
| Pricing and money | `src/lib/pricing`, `src/components/shared` | 19 + 7 | — |
| Data import and loading | `src/lib/data` | 12 | — |
| AI list matching | `src/lib/matching`, `tests/ai-eval` | 10 + golden set (27 cases) | — |
| My List and API request handling | `src/lib/list`, `src/components/list`, `src/lib/api` | 10 + 5 + 7 | `list.spec.ts` |
| AI layer (Gemini client, validators, explanations, rate limit) | `src/lib/ai` | 20 | — |
| Smart Swaps | `src/lib/swaps`, `src/components/swaps` | 10 + 6 | `swaps.spec.ts` |
| Recalls & Safety | `src/lib/recalls`, `src/components/recalls` | 16 + 5 | `recalls-settings.spec.ts` |
| Deal Watch | `src/lib/deals`, `src/components/deals` | 11 + 6 | `deals.spec.ts` |
| Settings | `src/components/settings` | 3 | `recalls-settings.spec.ts` |
| Saved preferences | `src/lib/preferences` | 9 | — |
| Dashboard and app shell | `src/components/dashboard`, `src/components/layout` | 5 + 4 | `dashboard.spec.ts`, `smoke.spec.ts` |
| Landing page and demo login | `src/components/landing`, `src/app/login`, `src/lib/auth` | 9 + 3 + 7 | `landing.spec.ts` |
| Config | `src/lib/config` | 3 | — |
| Security (incl. production-build key scan) | `tests/security` | 32 | `smoke.spec.ts` (headers), `demo-journey.spec.ts` (offline) |
| Full demo journey | — | — | `demo-journey.spec.ts` |

Run `npm run report` for the live numbers.

## Regression tests

Every bug fix starts with a test that reproduces the bug (named `regression: ...`), then the fix.

| Bug | Test |
|---|---|
| List text like `constructor` or `__proto__` looked up a built-in property in the saved embeddings | `src/lib/ai/gemini.test.ts` |
| "rice" matched Crispy Rice Cereal instead of rice | `src/lib/matching/core.test.ts` |
| Smart Swaps swapped plain Greek yogurt for vanilla, and whole wheat bread for white | `src/lib/swaps/findSwaps.test.ts` |
| The Dashboard link pointed at the landing page instead of `/plan` | `src/components/layout/nav.test.ts` |
| The demo login landed on a missing `/plan` page instead of the dashboard | `tests/e2e/landing.spec.ts` |
| A huge request body was read into memory in full before the size check | `src/lib/api/http.test.ts` |
