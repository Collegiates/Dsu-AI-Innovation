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
