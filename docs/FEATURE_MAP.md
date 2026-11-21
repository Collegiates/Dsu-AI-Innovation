# Feature Map

For each feature: what it does, the page URL, the code files and the test files.

## Trip optimizer

**What it does:** Takes the weekly list (the products the shopper usually buys) and decides which store(s) on the commute to stop at and what to buy at each. It tries every group of 1 to 5 stores, buys each item at the cheapest store in that group (only swapping to a product with the same group and variant), and scores each trip as groceries + gas + the shopper's time valued by their preference (fastest / balanced / maxSavings). Trips that get every item win first. It returns the recommended trip, the cheapest single-store trip and the fastest trip, each with savings against the usual products at the usual store. Items no store carries are listed as missing, never priced at $0. Pure code, no AI.

**Page:** `/trip` (UI not built yet).

**Code:**
- `src/lib/trip/optimizer.ts`: store combinations, scoring, recommended/cheapest/fastest plans, baseline savings
- `src/lib/trip/basket.ts`: basket lines, compatible alternatives (same groupKey + same variant + same kind of unit), detergent "formulas differ" comparison
- `src/lib/pricing/price.ts`: unit price (lb→oz, gal→fl oz, null for incompatible units), sale price, whole packages needed, checkout cost
- `src/lib/pricing/money.ts`: exact cents and money formatting
- `src/lib/config/app.ts`: gas cost, minutes per extra stop, value of time per preference

**Tests:** `src/lib/trip/optimizer.test.ts`, `src/lib/trip/basket.test.ts`, `src/lib/pricing/price.test.ts`, `src/lib/pricing/money.test.ts`

## Data import and loading

**What it does:** Turns the data person's CSVs (`data/raw/stores.csv`, `products.csv`, `price-audit.csv`) into `data/stores.json` and `data/products.json`, checking every row. Problems are listed with file and row number and nothing is written. Blank detours are errors, never 0. Every product must match a price-audit row with the same price. The app loads the JSON once and stops with a clear message if it is invalid.

**Run:** `npm run import-data`

**Code:** `src/lib/data/schema.ts`, `src/lib/data/csv.ts`, `src/lib/data/import.ts`, `src/lib/data/load.ts`, `scripts/import-csv.ts`

**Tests:** `src/lib/data/import.test.ts`, `src/lib/data/load.test.ts`

## AI list matching

**What it does:** Turns messy list text ("2 gal milk", "yougurt", "the cheap bread") into catalog products. Three steps: embeddings find the 5 closest products by meaning → code keeps only the top product's category and separates variants → code sorts interchangeable products by unit price. Each line gets a label: "Same product", "Similar" (check it) or "No match". With no Gemini key, no saved embeddings, or no internet, it falls back to keyword matching (word overlap that tolerates small typos). The typed text is compared as data only; it never goes into an AI prompt.

**API:** `POST /api/match` with `{ "items": ["2 gal milk", ...] }`. Page: `/list` (UI not built yet).

**Code:** `src/lib/matching/match.ts` (server entry), `src/lib/matching/core.ts` (embedding + keyword matching, labels, filters), `src/lib/matching/text.ts` (word normalization, typo tolerance), `src/lib/matching/embeddings.ts`, `src/lib/ai/gemini.ts`, `scripts/build-embeddings.ts`, `src/app/api/match/route.ts`

**Tests:** `src/lib/matching/core.test.ts`, `tests/ai-eval/matching.eval.test.ts` (golden set), `tests/security/api-routes.test.ts`

## Smart Swaps

**What it does:** For each list item, finds the cheapest similar product (same category and product family) from a different brand that is cheaper per unit **and** cheaper at the register for the amount needed, skipping hidden brands and products. Savings are computed by code. Gemini writes a one-sentence explanation from those facts only; the validator rejects any sentence with a wrong amount or percentage, an outside brand or store, HTML, or more than 25 words, and a template sentence is used instead. Explanations are cached by swap id.

**API:** `POST /api/swaps` with `{ "basket": [{ "usualProductId": "..." }], "hiddenBrands": [], "hiddenProducts": [] }`. Page: `/swaps` (UI not built yet).

**Code:** `src/lib/swaps/findSwaps.ts`, `src/lib/ai/explainSwap.ts`, `src/lib/ai/validators.ts`, `src/app/api/swaps/route.ts`

**Tests:** `src/lib/swaps/findSwaps.test.ts`, `src/lib/ai/explainSwap.test.ts`, `src/lib/ai/validators.test.ts`, `tests/security/api-routes.test.ts`
