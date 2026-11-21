/**
 * Turns the data person's spreadsheets into the JSON files the app reads.
 * Reads data/raw/stores.csv, products.csv and price-audit.csv, checks every row, and writes
 * data/stores.json and data/products.json. If any row is wrong, it lists each problem with its row number
 * and writes nothing. Example: npm run import-data
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { importCatalog } from "../src/lib/data/import";

const dataDir = join(process.cwd(), "data");
const read = (file: string) => readFileSync(join(dataDir, "raw", file), "utf8");

const result = importCatalog({
  storesCsv: read("stores.csv"),
  productsCsv: read("products.csv"),
  auditCsv: read("price-audit.csv"),
});

if (!result.ok) {
  console.error(`Import failed with ${result.errors.length} problem(s). Nothing was written.\n`);
  for (const error of result.errors) console.error(`  - ${error}`);
  process.exit(1);
}

writeFileSync(join(dataDir, "stores.json"), JSON.stringify(result.stores, null, 2) + "\n");
writeFileSync(join(dataDir, "products.json"), JSON.stringify(result.products, null, 2) + "\n");
console.log(`Imported ${result.stores.length} stores and ${result.products.length} products into data/.`);
