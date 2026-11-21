# Feature Map

For each feature: what it does, the page URL, the code files and the test files.

| Feature | What it does | Page URL | Code files | Test files |
|---|---|---|---|---|
| Trip optimizer | Picks which store(s) on the commute to stop at and what to buy at each, weighing savings against gas and time. Pure code. | `/trip` | `src/lib/trip/optimizer.ts`, `src/lib/trip/basket.ts`, `src/components/trip/` | `src/lib/trip/optimizer.test.ts`, `src/lib/trip/basket.test.ts`, `src/components/trip/TripPlanner.test.tsx`, `tests/e2e/trip.spec.ts` |
| Pricing | Unit prices, sale prices, packages needed, exact-cent money formatting. | (all pages) | `src/lib/pricing/price.ts`, `src/lib/pricing/money.ts` | `src/lib/pricing/price.test.ts`, `src/lib/pricing/money.test.ts` |
| Data import | Turns the data person's CSVs into checked JSON; refuses blank detours and unaudited prices. | `npm run import-data` | `src/lib/data/import.ts`, `src/lib/data/load.ts`, `scripts/import-csv.ts` | `src/lib/data/import.test.ts`, `src/lib/data/load.test.ts` |
| AI list matching | Messy list text → real products with a "Same product" / "Similar" / "No match" label. | `/list`, `POST /api/match` | `src/lib/matching/`, `src/lib/ai/gemini.ts`, `src/app/api/match/route.ts` | `src/lib/matching/core.test.ts`, `tests/ai-eval/`, `tests/security/api-routes.test.ts` |
| My List | Enter the list, see matches, set quantities, move occasional buys to Deal Watch. | `/list` | `src/components/list/ListBuilder.tsx`, `src/lib/list/list.ts` | `src/components/list/ListBuilder.test.tsx`, `src/lib/list/list.test.ts`, `tests/e2e/list.spec.ts` |
| Smart Swaps | Cheaper same-variant products; code computes savings, AI writes a checked sentence; "never show again". | `/swaps`, `POST /api/swaps` | `src/lib/swaps/findSwaps.ts`, `src/lib/ai/explainSwap.ts`, `src/lib/ai/validators.ts`, `src/components/swaps/SwapsView.tsx` | `src/lib/swaps/findSwaps.test.ts`, `src/lib/ai/explainSwap.test.ts`, `src/lib/ai/validators.test.ts`, `tests/e2e/swaps.spec.ts` |
| Recalls & Safety | Checks the list against FDA food recalls (live openFDA, saved copy offline); "possible match" only. | `/recalls`, `POST /api/recalls` | `src/lib/recalls/`, `src/components/recalls/RecallsView.tsx` | `src/lib/recalls/*.test.ts`, `src/components/recalls/RecallsView.test.tsx`, `tests/e2e/recalls-settings.spec.ts` |
| Deal Watch | Waitlist of occasional buys; flags 10%+ drops or target prices; clearly labeled simulated next week. | `/deals` | `src/lib/deals/`, `src/components/deals/DealWatch.tsx` | `src/lib/deals/*.test.ts`, `src/components/deals/DealWatch.test.tsx`, `tests/e2e/deals.spec.ts` |
| Settings | Route, stores and detours, default trip preference, hidden brands/products. | `/settings` | `src/components/settings/SettingsView.tsx`, `src/lib/trip/detour.ts` | `src/components/settings/SettingsView.test.tsx`, `src/lib/trip/detour.test.ts`, `tests/e2e/recalls-settings.spec.ts` |
| Saved preferences | List, hidden brands, waitlist and preference in localStorage, checked with zod. | (all pages) | `src/lib/preferences/` | `src/lib/preferences/storage.test.ts` |
| Dashboard | This week's savings, the recommended trip, and what needs attention. | `/plan` | `src/app/plan/page.tsx`, `src/lib/dashboard/data.ts`, `src/components/dashboard/` | `src/components/dashboard/DashboardView.test.tsx`, `tests/e2e/dashboard.spec.ts` |
| Landing page and demo login | Public home page and a one-click demo login. | `/`, `/login` | `src/components/landing/`, `src/app/login/`, `src/lib/auth/` | `src/components/landing/LandingPage.test.tsx`, `src/lib/auth/*.test.ts*`, `tests/e2e/landing.spec.ts` |
| Full demo journey | The live demo script end to end, with the internet blocked. | all | — | `tests/e2e/demo-journey.spec.ts` |
| MCP connector | Private, read-only MCP interface for ChatGPT over OpenAI Secure MCP Tunnel (`search_catalog`, `list_stores`, `match_grocery_items`, `plan_grocery_trip`). | `npm run mcp` | `src/mcp/server.ts`, `scripts/mcp-server.ts`, `docs/MCP_CONNECTOR.md` | `src/mcp/server.test.ts` |

**Nov 21 change: stores instead of a commute.** Shoppers tick their stores on `/plan` (`src/components/plan/StorePicker.tsx`, saved as `selectedStores`; Walmart + ALDI by default, stores without prices disabled). Detours are optional (blank → `null`, never 0); with null detours a trip costs groceries + 10 min × the preference's time value per extra store, with no gas (`src/lib/trip/optimizer.ts`, tests incl. `regression: null detours never produce NaN or $0 totals`). `/trip` opens with "Shop at ALDI: $X" beside each other store's own total, "Cheaper swap: save $X" chips linking to `/swaps`, and a past-purchase recall banner; `/recalls` shows that national FDA recall (H-1380-2026, lot 6040 01-6) as a labeled hypothetical past purchase (`src/components/recalls/PastPurchaseRecall.tsx`, facts in `DEMO_PAST_PURCHASE_RECALL`). All commute, detour and gas text is gone from the app; the parts of the sections below that mention them are out of date. Full journey: `tests/e2e/demo-journey.spec.ts`.

Details for each feature follow.

## Trip optimizer

**What it does:** Takes the weekly list (the products the shopper usually buys) and decides which store(s) on the commute to stop at and what to buy at each. It tries every group of 1 to 5 stores, buys each item at the cheapest store in that group (only swapping to a product with the same group and variant), and scores each trip as groceries + gas + the shopper's time valued by their preference (fastest / balanced / maxSavings). Trips that get every item win first. It returns the recommended trip, the cheapest single-store trip and the fastest trip, each with savings against the usual products at the usual store. Items no store carries are listed as missing, never priced at $0. Pure code, no AI.

**Page:** `/trip`: the main demo screen. A three-way switch ("Get home fastest" / "Balance" / "Maximize savings", saved in the browser) re-plans instantly in the browser. Left: the commute drawing with the chosen stops and every store's detour, then the cost breakdown (groceries, estimated gas with the miles × $0.15 shown, trip total, the usual-trip total, extra minutes split into detours and stop time). Right: one card per stop with the store, detour, every item and the subtotal; cheaper equivalents are marked. Missing and unmatched items are listed, never priced. Below: "Cheapest single store" vs. "Fastest" vs. "Recommended". DataSourceNote at the bottom. Screenshot: `docs/screenshots/results-1440x900.png`.

**Page code:** `src/app/trip/page.tsx`, `src/components/trip/TripPlanner.tsx`, `src/components/trip/StopCard.tsx`, `src/components/trip/PlanComparison.tsx`, `src/components/shared/PreferencePicker.tsx`, `src/components/shared/CommuteLine.tsx`

**Code:**
- `src/lib/trip/optimizer.ts`: store combinations, scoring, recommended/cheapest/fastest plans, baseline savings
- `src/lib/trip/basket.ts`: basket lines, compatible alternatives (same groupKey + same variant + same kind of unit), detergent "formulas differ" comparison
- `src/lib/pricing/price.ts`: unit price (lb→oz, gal→fl oz, null for incompatible units), sale price, whole packages needed, checkout cost
- `src/lib/pricing/money.ts`: exact cents and money formatting
- `src/lib/config/app.ts`: gas cost, minutes per extra stop, value of time per preference

**Tests:** `src/lib/trip/optimizer.test.ts`, `src/lib/trip/basket.test.ts`, `src/lib/pricing/price.test.ts`, `src/lib/pricing/money.test.ts`, `src/components/trip/TripPlanner.test.tsx`, `tests/e2e/trip.spec.ts`

## Data import and loading

**What it does:** Turns the data person's CSVs (`data/raw/stores.csv`, `products.csv`, `price-audit.csv`) into `data/stores.json` and `data/products.json`, checking every row. Problems are listed with file and row number and nothing is written. Blank detours are errors, never 0. Every product must match a price-audit row with the same price. The app loads the JSON once and stops with a clear message if it is invalid.

**Run:** `npm run import-data`

**Code:** `src/lib/data/schema.ts`, `src/lib/data/csv.ts`, `src/lib/data/import.ts`, `src/lib/data/load.ts`, `scripts/import-csv.ts`

**Tests:** `src/lib/data/import.test.ts`, `src/lib/data/load.test.ts`

## AI list matching

**What it does:** Turns messy list text ("2 gal milk", "yougurt", "the cheap bread") into catalog products. Three steps: embeddings find the 5 closest products by meaning → code keeps only the top product's category and separates variants → code sorts interchangeable products by unit price. Each line gets a label: "Same product", "Similar" (check it) or "No match". With no Gemini key, no saved embeddings, or no internet, it falls back to keyword matching (word overlap that tolerates small typos). The typed text is compared as data only; it never goes into an AI prompt.

**API:** `POST /api/match` with `{ "items": ["2 gal milk", ...] }`. Page: `/list` (see My List below).

**Code:** `src/lib/matching/match.ts` (server entry), `src/lib/matching/core.ts` (embedding + keyword matching, labels, filters), `src/lib/matching/text.ts` (word normalization, typo tolerance), `src/lib/matching/embeddings.ts`, `src/lib/ai/gemini.ts`, `scripts/build-embeddings.ts`, `src/app/api/match/route.ts`

**Tests:** `src/lib/matching/core.test.ts`, `tests/ai-eval/matching.eval.test.ts` (golden set), `tests/security/api-routes.test.ts`

## My List

**What it does:** The shopper types the weekly list (one per line or comma-separated) or presses "Load demo list", then "Match my list". The page calls `POST /api/match` and shows each line with the matched real product (size, store, price) and a confidence badge: "Same product", "Similar" (with "check it's what you usually buy") or "No match" (with a hint). Each line has a quantity stepper (1–20) and "Move to Deal Watch" for occasional buys (it adds the product group to the waitlist and takes the line off the list). The list is saved in the browser (checked with zod) and feeds the Trip Plan, Smart Swaps and Recalls pages. "Build my trip plan" goes to `/trip`. Screenshot: `docs/screenshots/list-1440x900.png`.

**Page:** `/list`

**Code:** `src/app/list/page.tsx`, `src/components/list/ListBuilder.tsx`, `src/lib/list/list.ts` (parsing typed text, choosing the usual store's product, quantities → basket), `src/lib/preferences/usePreference.ts` (saved list shared by every page), `src/lib/api/client.ts`, `src/components/shared/WithCatalog.tsx`

**Tests:** `src/components/list/ListBuilder.test.tsx`, `src/lib/list/list.test.ts`, `src/lib/api/client.test.ts`, `tests/e2e/list.spec.ts`

## Smart Swaps

**What it does:** For each list item, finds the cheapest similar product (same product family **and the same variant**, so plain yogurt is never swapped for vanilla or whole wheat bread for white; sizes may differ) from a different brand that is cheaper per unit **and** cheaper at the register for the amount needed, skipping hidden brands and products. Savings are computed by code. Gemini writes a one-sentence explanation from those facts only; the validator rejects any sentence with a wrong amount or percentage, an outside brand or store, HTML, or more than 25 words, and a template sentence is used instead. Explanations are cached by swap id.

**API:** `POST /api/swaps` with `{ "basket": [{ "usualProductId": "..." }], "hiddenBrands": [], "hiddenProducts": [] }`. Page: `/swaps`.

**Page:** one row per swap for the saved list: what you buy → what to try instead (size, store, price, unit price), the weekly saving in $ and %, and the explanation sentence, labeled "AI-written, numbers checked" or "written from the computed numbers". "Try it" puts the suggestion on the list (undo toast). "Never show again" offers this product or the whole brand; the row disappears at once with an undo toast, and the list is re-checked with the hidden brands/products. "How we chose this" shows the category, the unit-price comparison and the list match confidence. A link goes to Settings to manage hidden brands. Screenshot: `docs/screenshots/swaps-1440x900.png`.

**Code:** `src/lib/swaps/findSwaps.ts`, `src/lib/ai/explainSwap.ts`, `src/lib/ai/validators.ts`, `src/app/api/swaps/route.ts`, `src/app/swaps/page.tsx`, `src/components/swaps/SwapsView.tsx`

**Tests:** `src/lib/swaps/findSwaps.test.ts`, `src/lib/ai/explainSwap.test.ts`, `src/lib/ai/validators.test.ts`, `tests/security/api-routes.test.ts`, `src/components/swaps/SwapsView.test.tsx`, `tests/e2e/swaps.spec.ts`

## Recalls & Safety

**What it does:** Checks the products on the list against FDA food recalls from the last 12 months (openFDA, the FDA's public data service). A product is flagged only when the recall's product description contains its **brand** (whole phrase) **and** at least one **key product word** (whole word, ignoring describing words like "fat", "fresh", "frozen"). Every match shows the recall number, reason, class, date and recalling firm, and is always labeled "Possible match — check the lot code on your package". The live API has a 5-second timeout; in demo mode, on timeout, or offline, a saved real response (`data/fixtures/recalls.json`, 1,000 records, trimmed to the fields used) is used. Malformed records are skipped and counted.

**API:** `POST /api/recalls` with `{ "productIds": [...] }`.

**Page:** `/recalls`. "Check my list now" sends the list's products plus the equivalents the trip might buy instead. Each possible match shows the product, reason, classification, report date, recall number, recalling firm, a link to the FDA record (openFDA, by recall number) and the "check the lot code" message, in the recall red (the only place red is used). The page says when it last checked, against how many recalls, and whether the data was live or the saved copy. No matches gives a calm "No possible matches". Screenshot: `docs/screenshots/recalls-1440x900.png`.

**Code:** `src/lib/recalls/openfda.ts`, `src/lib/recalls/schema.ts`, `src/lib/recalls/match.ts`, `src/app/api/recalls/route.ts`, `src/app/recalls/page.tsx`, `src/components/recalls/RecallsView.tsx`

**Tests:** `src/lib/recalls/match.test.ts`, `src/lib/recalls/schema.test.ts`, `src/lib/recalls/openfda.test.ts`, `tests/security/api-routes.test.ts`, `src/components/recalls/RecallsView.test.tsx`, `tests/e2e/recalls-settings.spec.ts`

## Deal Watch

**What it does:** A waitlist of occasional buys (product group + optional target price). An item is a deal when the same product's price fell at least 10%, or is at or below the target; the cheapest such product per item is shown with its store and the amount saved. The "Simulate next week's prices" button applies `data/fixtures/prices-next-week.json`: **simulated** sale prices on 3 real products (toothpaste, detergent, paper towels). With the demo waitlist this gives 3 alerts and none for shampoo.

**Page:** `/deals`. Each waitlist item shows today's cheapest product, its store and an optional target price (editable, saved in the browser), with a remove button. Items are added with "Move to Deal Watch" on My List or "Load demo waitlist". The clearly labeled "Simulate next week's prices" button switches to the simulated prices ("made up for the demo, not real") and highlights deals: old price struck through (only when the price really fell), new price, % less, store, and "at or under your target". A note says that in the full product prices are checked automatically and alerts are sent by email. Screenshot: `docs/screenshots/deals-1440x900.png`.

**Code:** `src/lib/deals/detectDeals.ts`, `src/lib/deals/nextWeek.ts`, `src/lib/deals/fixture.ts` (reads and checks the simulated file), `src/lib/config/demo.ts` (`DEMO_WAITLIST`), `src/app/deals/page.tsx`, `src/components/deals/DealWatch.tsx`

**Tests:** `src/lib/deals/detectDeals.test.ts`, `src/lib/deals/nextWeek.test.ts`, `src/lib/deals/fixture.test.ts`, `src/components/deals/DealWatch.test.tsx`, `tests/e2e/deals.spec.ts`

## Settings

**What it does:** Shows the demo commute (read-only), the stores on it nearest first with their detour and how it was measured, the default trip preference (the same switch as the Trip Plan, saved in the browser), and the brands and products hidden from Smart Swaps, each with a "Show … again" button. Screenshot: `docs/screenshots/settings-1440x900.png`.

**Page:** `/settings`

**Code:** `src/app/settings/page.tsx`, `src/components/settings/SettingsView.tsx`, `src/components/shared/PreferencePicker.tsx`, `src/lib/trip/detour.ts`

**Tests:** `src/components/settings/SettingsView.test.tsx`, `src/lib/trip/detour.test.ts`, `tests/e2e/recalls-settings.spec.ts`

## Saved preferences

**What it does:** Typed helpers that save the shopping list, hidden brands, hidden products, the Deal Watch waitlist and the trip preference in the browser's localStorage. Every save notifies open pages, so a change on one page shows up on the others at once. Every value is checked with zod on read and write; if storage is blocked, full or corrupted, the defaults are used and nothing crashes. Nothing sensitive is stored.

**Code:** `src/lib/preferences/storage.ts`, `src/lib/preferences/usePreference.ts` · **Tests:** `src/lib/preferences/storage.test.ts`

## Dashboard and app shell

**What it does:** The Dashboard (where the demo login lands) shows exactly three blocks. (1) **Savings hero:** this week's optimized total vs. the typical total (usual products at the usual store, gas included), the savings in dollars and percent, and "View trip plan". (2) **Recommended trip:** a drawing of the commute (DSU → Home) with a pin per store, the chosen stop(s) with subtotals, extra minutes and gas. (3) **Needs your attention:** at most one possible recall and the top two Deal Watch items, each linking to its page. Every number comes from the real optimizer, recall matcher and Deal Watch code. The demo list is matched to the usual store's products by the matching code. The sidebar links to every page; the top bar shows the page title and the commute. Screenshot: `docs/screenshots/plan-1440x900.png` (e2e test data: real prices, test detours).

**Page:** `/plan` (demo login required; without it the visitor is sent to the landing page)

**Code:** `src/app/plan/page.tsx`, `src/lib/dashboard/data.ts`, `src/lib/trip/demoBasket.ts`, `src/components/dashboard/` (SavingsHero, TripCard, AttentionStrip, DashboardView, DashboardSkeleton), `src/components/layout/` (AppShell, Sidebar, TopBar, nav), `src/components/shared/` (PageHeader, StatCard, Money, ConfidenceBadge, EmptyState, ErrorState, LoadingSkeleton, DataSourceNote, CommuteLine, WithCatalog), design tokens in `src/app/globals.css`

**Tests:** `src/components/dashboard/DashboardView.test.tsx`, `src/components/layout/nav.test.ts`, `src/components/shared/Money.test.tsx`, `src/components/shared/ConfidenceBadge.test.tsx`, `tests/e2e/dashboard.spec.ts`, `tests/e2e/smoke.spec.ts`

## Landing page and demo login

**What it does:** The public home page at `/`, shown without the app's sidebar: an animated hero drawing of the commute (DSU → Home, labeled "Illustration", with store badges; CSS-only and still when the visitor prefers reduced motion), "How it works", a numbers band (two published statistics with their sources printed underneath and one illustrative estimate that says so), a "Numbers you can check" trust section and a closing call to action. "Try the demo" goes to `/login`, where "Continue as James (demo)" sets a demo flag in the browser and opens the Dashboard at `/plan`. The flag is a demo switch, not security: no accounts, no passwords, nothing personal stored. `/plan` and `/settings` send visitors without it back to `/`.

**Pages:** `/` and `/login`

**Code:** `src/app/page.tsx`, `src/components/landing/` (LandingPage, Hero, CommuteAnimation, HowItWorks, StatsBand, TrustSection, FooterCta, LandingHeader, CountUp, Reveal, storeLogos), `src/app/login/page.tsx`, `src/app/login/DemoLoginCard.tsx`, `src/lib/auth/demo.ts`, `src/lib/auth/RequireDemo.tsx`, `src/components/layout/AppShell.tsx` (hides the sidebar on `/` and `/login`)

**Tests:** `src/components/landing/LandingPage.test.tsx`, `src/app/login/DemoLoginCard.test.tsx`, `src/lib/auth/demo.test.ts`, `src/lib/auth/RequireDemo.test.tsx`, `tests/e2e/landing.spec.ts`, `tests/e2e/dashboard.spec.ts`

## MCP connector

**What it does:** Offers a private, read-only MCP interface for OpenAI clients over Secure MCP Tunnel. `search_catalog` and `list_stores` expose the checked catalog and store data; `match_grocery_items` uses the existing matcher; `plan_grocery_trip` matches a supplied list and runs the same deterministic trip optimizer. Trip preference is required because the connector cannot read browser preferences. Unmatched items are reported without a price, and price-source context accompanies results.

**Run:** `npm run mcp` starts the stdio server for `tunnel-client`. Setup and ChatGPT connection steps: `docs/MCP_CONNECTOR.md`.

**Code:** `src/mcp/server.ts`, `scripts/mcp-server.ts`, `src/lib/matching/match.ts`, `src/lib/trip/optimizer.ts`

**Tests:** `src/mcp/server.test.ts`, `src/lib/matching/match.test.ts`, `src/lib/trip/optimizer.test.ts`
