import { existsSync, readFileSync } from "node:fs";
import { importCatalog } from "@/lib/data/import";
import { ProductsFileSchema, type Product } from "@/lib/data/schema";

/**
 * The real product catalog for the AI eval: data/products.json when it exists, otherwise the product rows from
 * data/raw/ that pass every check. Never placeholder data. Example: 55 products from Aldi and Walmart.
 */
export function evalCatalog(): { products: Product[]; source: string } {
  if (existsSync("data/products.json")) {
    return { products: ProductsFileSchema.parse(JSON.parse(readFileSync("data/products.json", "utf8"))), source: "data/products.json" };
  }
  const raw = (f: string) => readFileSync(`data/raw/${f}`, "utf8");
  const result = importCatalog({ storesCsv: raw("stores.csv"), productsCsv: raw("products.csv"), auditCsv: raw("price-audit.csv") });
  return { products: result.ok ? result.products : result.validProducts, source: "data/raw/products.csv (valid rows)" };
}

/** One golden case: what a shopper typed and the product group(s) a person would accept. */
export type GoldenCase = { input: string; expected: string | null; acceptable?: string[]; note?: string };

export function goldenCases(): GoldenCase[] {
  return JSON.parse(readFileSync("tests/ai-eval/golden-matches.json", "utf8")).cases;
}
