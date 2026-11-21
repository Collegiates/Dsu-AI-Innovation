# ReRoute

Helps a household buy its weekly groceries for less **using stores already on their daily commute**.
Type a grocery list; the app matches it to real products, plans which store(s) to stop at on the drive home,
suggests cheaper swaps, checks the list against FDA food recalls, and watches prices on occasional buys.

**Code does the math, AI does the language.** Every price, total, saving and trip choice is computed by plain, tested
TypeScript. Gemini only reads messy list text and writes short explanations, and code checks its output before it is shown.

## Run it

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run import-data
```

```bash
npm run dev
```

Open http://localhost:3000 at 1440×900, press **Try the demo**, then **Continue as Tasha (demo)**.

- `npm run import-data` turns `data/raw/*.csv` into `data/stores.json` and `data/products.json`. It refuses blank store detours,
  so each store's detour must be measured and entered in `data/raw/stores.csv` first.
- `DEMO_MODE=true` (the default in `.env.example`) runs everything offline with saved data in `data/fixtures/`.
- With a `GEMINI_API_KEY`, run `npm run build-embeddings` to enable embedding-based matching; without one, keyword matching is used.

## Pages

| Page | URL |
|---|---|
| Landing page and demo login | `/`, `/login` |
| Dashboard | `/plan` |
| My List | `/list` |
| Trip Plan (main demo screen) | `/trip` |
| Smart Swaps | `/swaps` |
| Deal Watch | `/deals` |
| Recalls & Safety | `/recalls` |
| Settings | `/settings` |

## Tests

```bash
npm run check
```

```bash
npm run test:e2e
```

```bash
npm run report
```

`check` = typecheck + lint + unit tests + AI eval + security tests. See `docs/TESTING.md`.

## Docs

- `docs/FEATURE_MAP.md`: each feature, its page, code and tests
- `docs/AI_VALIDATION.md`: where AI is used and how its output is checked
- `docs/SECURITY.md`: each security measure and its test
- `docs/TESTING.md`: test commands, counts and regression tests
- `docs/JUDGE_QA.md`: likely questions and where to point
- `docs/SLIDES_BACKUP.md`: four backup slides (AI validation, testing, security, architecture)

Built with Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, zod, Gemini (`@google/genai`), Vitest and Playwright.
