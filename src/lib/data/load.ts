import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ProductsFileSchema, StoresFileSchema, type Product, type Store } from "./schema";

/** All stores and products, plus a quick lookup of products by id. */
export type Catalog = {
  stores: Store[];
  products: Product[];
  productsById: Map<string, Product>;
};

/**
 * Checks raw store and product data and returns a catalog, or throws an error listing every problem.
 * It also checks that each product's store exists and that no product id is used twice.
 * Example: a product with price -1 throws "products.json [3].price: Too small...".
 */
export function parseCatalog(storesData: unknown, productsData: unknown): Catalog {
  const problems: string[] = [];
  const stores = StoresFileSchema.safeParse(storesData);
  const products = ProductsFileSchema.safeParse(productsData);
  const describe = (file: string, error: { issues: { path: PropertyKey[]; message: string }[] }) =>
    error.issues.map((i) => `${file} [${i.path.map(String).join(".")}]: ${i.message}`);

  if (!stores.success) problems.push(...describe("stores.json", stores.error));
  if (!products.success) problems.push(...describe("products.json", products.error));

  if (stores.success && products.success) {
    const storeIds = new Set(stores.data.map((s) => s.id));
    const seen = new Set<string>();
    for (const p of products.data) {
      if (!storeIds.has(p.storeId)) problems.push(`products.json: "${p.id}" belongs to unknown store "${p.storeId}"`);
      if (seen.has(p.id)) problems.push(`products.json: id "${p.id}" is used twice`);
      seen.add(p.id);
    }
  }

  if (problems.length > 0 || !stores.success || !products.success) {
    throw new Error(`The grocery data is invalid, so the app will not run with it:\n  - ${problems.join("\n  - ")}`);
  }
  return {
    stores: stores.data,
    products: products.data,
    productsById: new Map(products.data.map((p) => [p.id, p])),
  };
}

let cached: Catalog | undefined;

/**
 * Reads data/stores.json and data/products.json once, checks them, and keeps the result in memory.
 * Bad or missing data stops the app with a clear message instead of showing wrong prices.
 * Example: if data/stores.json is missing, it says to run "npm run import-data" first.
 */
export function loadCatalog(): Catalog {
  if (cached) return cached;
  // GROCERYSAVE_DATA_DIR lets end-to-end tests point the app at their own test data folder.
  const dir = process.env.GROCERYSAVE_DATA_DIR ?? "data";
  const readJson = (file: string): unknown => {
    const path = join(process.cwd(), dir, file);
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch (cause) {
      throw new Error(`Could not read ${dir}/${file}. Run "npm run import-data" to create it from data/raw/.`, { cause });
    }
  };
  cached = parseCatalog(readJson("stores.json"), readJson("products.json"));
  return cached;
}
