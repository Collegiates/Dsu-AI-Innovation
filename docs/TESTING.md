# Testing

How to run the tests, test counts per feature, and the list of regression tests.

## How to run

| Command | What it runs |
|---|---|
| `npm run check` | typecheck + lint + unit tests + AI eval + security tests (must pass before every commit) |
| `npm test` | unit and component tests next to the code in `src/` |
| `npm run eval` | AI golden sets in `tests/ai-eval/` |
| `npm run test:security` | security tests in `tests/security/` |
| `npm run test:e2e` | Playwright journeys in `tests/e2e/` (Chromium, 1440×900, starts the dev server in demo mode) |
| `npm run report` | test counts per folder, regression tests, e2e journeys, latest AI eval accuracy |

The AI eval should save its latest score to `tests/ai-eval/latest-result.json` as
`{ "accuracy": 0.94, "correct": 47, "total": 50, "mode": "cached", "runAt": "<ISO date>" }`, which `npm run report` reads.
Until the eval exists, `npm run eval` passes with no tests (`--passWithNoTests`); remove that flag once golden sets are added.
