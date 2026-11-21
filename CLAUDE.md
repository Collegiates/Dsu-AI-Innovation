# CLAUDE.md — GrocerySave (working name)

Claude Code reads this file at the start of every session. Follow it on every task.

This project uses Next.js 16, which differs from older versions (for example, `cacheComponents` is on). Read these notes before writing Next.js code:

@AGENTS.md

## What we are building

A desktop web app that helps a household buy its weekly groceries for less **using stores already on their daily commute**.
The user enters a grocery list, and the app:

1. Matches each item to real products at nearby stores (AI matching).
2. Builds a trip plan: which store(s) to stop at and what to buy at each, balancing savings against extra driving time (plain code, no AI).
3. Suggests cheaper swaps for similar products, with a "never show again" option (AI-written explanation, code-checked).
4. Checks the list against FDA food recalls (live openFDA API with a cached backup).
5. Keeps a "Deal Watch" waitlist for items bought occasionally (toothpaste, shampoo) and flags price drops.

Context: this is a 24-hour hackathon build. The app is demoed **live on a laptop at 1440×900**, running locally (`npm run dev`). Scoring: Problem & Impact 25, AI & Prototype 25, Presentation & Demo 20, Innovation 15, Business Feasibility 15. Judges will ask *"how do you know the AI output is right?"* and *"where is feature X in the code?"* — the code, tests and docs must answer both quickly.

## Golden rules

1. **Code does the math, AI does the language.** Prices, totals, unit prices, savings, trip choices and recall matching rules are computed in plain TypeScript. AI is used only for: understanding messy list text, grouping equivalent products, and writing short explanations. AI never produces a number that the user sees unless code has checked it.
2. **Every feature ships with tests.** No feature is "done" until its tests exist and pass.
3. **Never break what already works.** Run `npm run check` before saying a task is done. Never delete, skip or weaken an existing test to make the suite pass. If a test fails, fix the code (or explain to the human why the test itself is wrong and wait for approval).
4. **Every bug fix starts with a regression test.** Write a test that reproduces the bug and fails, then fix the code, then confirm the test passes. Name it `regression: <short description of the bug>`.
5. **The demo must survive bad wifi.** Everything shown in the demo must work with `DEMO_MODE=true` and no internet, using cached fixtures in `data/fixtures/`.
6. **Small, focused changes.** One feature per change. Commit after `npm run check` passes, with a message like `feat(trip): add store-combination optimizer`.
7. **Ask before adding any dependency** that is not listed in the stack below.
8. **Never invent data.** Prices come only from `data/products.json`. If something is missing, show it as missing; do not fill it in.

## Stack (fixed — do not change without asking)

- Next.js (App Router) + TypeScript in `strict` mode
- Tailwind CSS + shadcn/ui components + lucide-react icons
- zod for validating every input and every AI response
- `@google/genai` for Gemini (chat model + embeddings), server-side only
- Vitest + React Testing Library for unit and component tests
- Playwright (TypeScript) for end-to-end tests
- No database: JSON files in `data/`. User preferences (hidden brands, waitlist) in `localStorage`.
- npm as the package manager

## Folder map

```
src/
  app/                      Pages (one folder per page) and API routes
    page.tsx                Dashboard
    list/                   My List — enter items, see matched products
    trip/                   Trip Plan — the route optimizer (main demo screen)
    swaps/                  Smart Swaps
    deals/                  Deal Watch (waitlist)
    recalls/                Recalls & Safety
    settings/               Route, stores, hidden brands
    api/                    Server routes: match, swaps, recalls
  components/
    ui/                     shadcn/ui building blocks (buttons, cards…)
    layout/                 Sidebar, top bar, app shell, nav config
    shared/                 PageHeader, StatCard, Money, ConfidenceBadge, EmptyState, ErrorState, LoadingSkeleton, DataSourceNote, CommuteLine, WithCatalog
    <feature>/              Components used by one feature only (e.g. dashboard/)
  lib/
    config/                 App name, constants, assumptions (gas cost etc.)
    data/                   Loading and validating the JSON data files
    pricing/                Unit price, money formatting, basket totals
    trip/                   Store-combination optimizer
    matching/               Embeddings, similarity search, keyword fallback
    ai/                     Gemini client, prompts, AI output validators
    swaps/                  Swap candidate selection + explanation checks
    recalls/                openFDA client + recall-to-product matching
    deals/                  Waitlist price-drop detection
    list/                   The saved shopping list: parsing typed text, quantities, list → basket
    preferences/            localStorage read/write (list, hidden brands, waitlist) + usePreference hook
data/
  raw/                      Source CSVs from the data person (stores, products, price-audit); `npm run import-data` turns them into the JSON below
  stores.json               Stores on the demo commute, with detour times
  products.json             ~50 real products with prices collected Nov 21
  embeddings.json           Pre-computed product embeddings (generated)
  groups.review.json        AI-proposed product groups, human-reviewed
  fixtures/                 Cached API responses for DEMO_MODE
scripts/                    One-off scripts (import CSV, build embeddings, group products, test report)
tests/
  e2e/                      Playwright tests of full user journeys (port 3100, test data in e2e/fixture-data/)
  ai-eval/                  Golden test sets that measure AI accuracy
  security/                 Security tests
docs/                       Evidence for judges (see "Docs" below)
```

Unit tests live **next to the file they test**: `src/lib/trip/optimizer.ts` → `src/lib/trip/optimizer.test.ts`. That way, anyone looking at a feature finds its tests in the same folder.

## AI rules (how we keep AI output valid)

- All Gemini calls go through `src/lib/ai/gemini.ts`, which begins with `import "server-only"`. Model names come from env vars `GEMINI_MODEL` and `GEMINI_EMBED_MODEL`.
- Every AI response must be JSON and must pass a zod schema in `src/lib/ai/validators.ts`. If it fails validation, the app uses a deterministic fallback (plain-code result or template text) and logs the reason.
- Any product ID the AI returns must exist in the catalog **and** in the candidate list we gave it. Otherwise it is rejected.
- Swap explanations: code passes in the exact facts (names, prices, savings). The validator checks that every dollar amount or percentage in the AI text matches a computed value. If not, a template sentence is used instead.
- User text is treated as data, never as instructions. Put it inside clearly marked delimiters in prompts, and limit its length. AI text is rendered as plain text, never as HTML.
- Recall matches require brand and product words to overlap (code rule). They are always shown as "Possible match — check the lot code on your package", never as certain.
- Matching uses three steps: embeddings find the closest catalog products → code filters by category, variant and size → code compares by unit price. Below a similarity threshold, label the match "Similar", not "Same product".
- `tests/ai-eval/` holds golden test sets (messy input → expected product group). `npm run eval` reports accuracy and fails below 90%. It runs on cached embeddings by default, and live against Gemini with `EVAL_LIVE=true`.

## Security rules

- Secrets live only in `.env.local` (git-ignored). Commit `.env.example` with empty values. The Gemini key must never reach the browser bundle (a security test checks this).
- Every API route validates its input with zod and enforces length limits (max 100 list items, max 100 characters per item). Return generic error messages, never stack traces.
- Simple in-memory rate limiting on AI routes (e.g. 30 requests/minute per IP).
- External calls (openFDA, Gemini) have a 5-second timeout and fall back to cached fixtures.
- No `dangerouslySetInnerHTML`. No `eval`. No secrets or personal data in `localStorage`.
- Security headers in `next.config` (Content-Security-Policy, X-Content-Type-Options, Referrer-Policy, frame-ancestors 'none').
- `npm audit` must show no high or critical issues.
- Run `/security-review` after each phase that adds an API route or AI call, and fix what it finds (with a regression test).

## Testing rules

- `npm run check` = typecheck + lint + unit tests + AI eval + security tests. It must pass before every commit.
- `npm run test:e2e` = Playwright journeys (run at the end of each UI phase).
- Test **behavior**, not implementation: "the plan picks Aldi when it is cheapest and the detour is under 5 minutes", not "function X calls Y".
- Each feature needs: a happy path, at least one edge case (empty list, missing product, store without the item), and one failure case (bad input, AI returns garbage, API offline).
- When a new feature is added, run the full suite so existing features are re-tested (that is our regression suite).
- `npm run report` prints the test count per feature and the AI eval accuracy. Judges can be shown this output.

## Comment style

Every exported function, component and API route gets a short comment above it, written in plain English for a reader who has never programmed. Say **what it does, why it exists, and an example**. If a technical term is unavoidable, explain it in the same sentence. Do not describe the comment itself (no "simple explanation", "for beginners", "easy to understand" or similar). Keep each comment to 2–5 lines.

Good:

```ts
/**
 * Works out the price per ounce (or per item) so different package sizes can be compared fairly.
 * Example: a 32 oz yogurt for $4.79 costs about 15 cents per ounce.
 * Returns null if the size is missing, so the app never shows a made-up number.
 */
export function unitPrice(product: Product): number | null { ... }
```

Bad: `// Helper fn — computes UP` (too cryptic), or `// Easy explanation: this function...` (talks about itself).

Inside functions, comment only the lines where the *reason* is not obvious.

## UI rules

- Desktop first: design for 1440×900, minimum width 1280. No mobile layout work.
- **One main job per page.** The Dashboard shows only three things: this week's savings, the recommended trip, and a "needs your attention" strip (recalls + deals). All other detail lives on its own page.
- Visual direction (from the team mockup, made more polished): warm off-white background, deep sage green primary, a serif display font for headings (e.g. Fraunces) and a clean sans for body text (e.g. Inter or Geist), generous white space, soft card borders instead of heavy shadows. Red is used **only** for recalls.
- Use lucide icons, not stock photos or product images.
- Money is always formatted by `src/lib/pricing/money.ts`, with tabular numbers so columns line up.
- Every data view has loading, empty and error states.
- Accessibility: text contrast at least 4.5:1, visible keyboard focus, labels on every input, and icons paired with text.
- Show data honesty in the UI: a small DataSourceNote line "Online prices from aldi.us and walmart.com, viewed Nov 21, 2026. In-store prices may differ." on the trip and list pages (text lives in `DATA_SOURCE_NOTE` in `src/lib/config/app.ts`). Simulated features are labeled (e.g. a "Simulate next week's prices" button on Deal Watch).
- The app name comes from `src/lib/config/app.ts` (`APP_NAME`), so renaming is a one-line change.

## Docs (evidence for judges — keep them updated)

- `docs/FEATURE_MAP.md` — for each feature: what it does, the page URL, the code files, the test files.
- `docs/AI_VALIDATION.md` — every place AI is used, how its output is checked, and the latest eval accuracy.
- `docs/SECURITY.md` — each security measure and the test that proves it.
- `docs/TESTING.md` — how to run the tests, test counts per feature, regression tests list.
- `docs/JUDGE_QA.md` — likely judge questions, short answers, and where to point in the app or code.

When you finish a feature, update `FEATURE_MAP.md` in the same commit.

## Definition of done (every task)

- [ ] Feature works in the browser at 1440×900
- [ ] Tests written: happy path, edge case, failure case
- [ ] `npm run check` passes and the full suite still passes
- [ ] Works with `DEMO_MODE=true` and wifi off
- [ ] Plain-English comments on every exported function
- [ ] `docs/FEATURE_MAP.md` updated
- [ ] Committed with a clear message
