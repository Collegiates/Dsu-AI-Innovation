import { z } from "zod";
import { readCsvRecords, type CsvRecord } from "./csv";
import { ProductSchema, SizeUnitSchema, StoreSchema, type Product, type Store } from "./schema";

/** The CSV files the data person fills in, read as plain text. */
export type RawCsvFiles = { storesCsv: string; productsCsv: string; auditCsv: string };

/** Either the cleaned stores and products, or every problem found, each naming its file and row. */
export type ImportResult =
  | { ok: true; stores: Store[]; products: Product[] }
  | { ok: false; errors: string[] };

const STORE_COLUMNS = ["store_id", "name", "chain", "address", "on_route_label", "detour_minutes", "detour_miles"] as const;
const PRODUCT_COLUMNS = [
  "store_id", "brand", "product_name", "size_value", "size_unit", "price", "sale_price", "category",
  "variant", "group_key", "is_store_brand", "product_url", "collected_at",
] as const;
const AUDIT_COLUMNS = ["store_id", "brand", "product_name", "displayed_price", "verification_status"] as const;

// A cell that must hold a number. Blank cells are an error, never quietly read as 0.
const requiredNumber = z
  .string()
  .min(1, "is blank (a blank is never treated as 0)")
  .refine((s) => s === "" || Number.isFinite(Number(s)), "is not a number")
  .transform(Number);

// A cell that may be blank (or a column that may be absent). Blank means "not given", never 0.
const optionalNumber = z
  .string()
  .optional()
  .refine((s) => !s || Number.isFinite(Number(s)), "is not a number")
  .transform((s) => (s ? Number(s) : undefined));

const optionalText = z
  .string()
  .optional()
  .transform((s) => s || undefined);

const StoreRowSchema = z.object({
  store_id: z.string().min(1, "is blank"),
  name: z.string().min(1, "is blank"),
  chain: z.string().min(1, "is blank"),
  address: z.string().min(1, "is blank"),
  on_route_label: z.string().min(1, "is blank"),
  detour_minutes: requiredNumber.pipe(z.number().nonnegative("must be 0 or more")),
  detour_miles: requiredNumber.pipe(z.number().nonnegative("must be 0 or more")),
});

const ProductRowSchema = z.object({
  store_id: z.string().min(1, "is blank"),
  brand: z.string().min(1, "is blank"),
  product_name: z.string().min(1, "is blank"),
  size_value: requiredNumber.pipe(z.number().positive("must be more than 0")),
  size_unit: SizeUnitSchema,
  price: requiredNumber.pipe(z.number().positive("must be more than 0")),
  sale_price: optionalNumber.pipe(z.number().positive("must be more than 0").optional()),
  category: z.string().min(1, "is blank"),
  variant: z.string().min(1, "is blank"),
  group_key: z.string().min(1, "is blank"),
  is_store_brand: z.enum(["true", "false"], "must be true or false").transform((s) => s === "true"),
  product_url: optionalText.pipe(z.url("is not a valid web address").optional()),
  loads: optionalNumber.pipe(z.number().int().positive("must be a whole number more than 0").optional()),
  collected_at: z.iso.date("must be a date like 2026-11-21"),
});

const AuditRowSchema = z.object({
  displayed_price: requiredNumber,
  verification_status: z.string().min(1, "is blank"),
});

/**
 * Builds a stable product id from its store, brand and name, so the same product always gets the same id.
 * Example: ("aldi-dover", "Friendly Farms", "2% Reduced Fat Milk") → "aldi-dover--friendly-farms--2-reduced-fat-milk".
 */
export function productId(storeId: string, brand: string, name: string): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/['’]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return `${slug(storeId)}--${slug(brand)}--${slug(name)}`;
}

/** Turns zod problems into readable lines like "products.csv row 7: price is not a number". */
function describeIssues(file: string, record: CsvRecord, error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const column = issue.path.length > 0 ? `${String(issue.path[0])} ` : "";
    const value = issue.path.length > 0 ? record.values[String(issue.path[0])] : undefined;
    const shown = value !== undefined && value !== "" ? ` (got "${value}")` : "";
    return `${file} row ${record.rowNumber}: ${column}${issue.message}${shown}`;
  });
}

const auditKey = (storeId: string, brand: string, name: string) =>
  [storeId, brand, name].map((s) => s.trim().toLowerCase()).join("|");

/**
 * Checks every row of the three CSV files and turns them into clean store and product records.
 * It collects all problems instead of stopping at the first, so the data person can fix them in one pass.
 * Example: a store with a blank detour_minutes gives "stores.csv row 3: detour_minutes is blank (a blank is never treated as 0)".
 */
export function importCatalog(files: RawCsvFiles): ImportResult {
  const errors: string[] = [];

  const storesCsv = readCsvRecords(files.storesCsv, STORE_COLUMNS);
  const productsCsv = readCsvRecords(files.productsCsv, PRODUCT_COLUMNS);
  const auditCsv = readCsvRecords(files.auditCsv, AUDIT_COLUMNS);
  for (const [file, parsed] of [["stores.csv", storesCsv], ["products.csv", productsCsv], ["price-audit.csv", auditCsv]] as const) {
    for (const col of parsed.missingColumns) errors.push(`${file}: missing column "${col}"`);
  }
  if (errors.length > 0) return { ok: false, errors };

  const stores: Store[] = [];
  const storeIds = new Set<string>();
  for (const record of storesCsv.records) {
    const row = StoreRowSchema.safeParse(record.values);
    if (!row.success) {
      errors.push(...describeIssues("stores.csv", record, row.error));
      continue;
    }
    if (storeIds.has(row.data.store_id)) {
      errors.push(`stores.csv row ${record.rowNumber}: store_id "${row.data.store_id}" appears twice`);
      continue;
    }
    storeIds.add(row.data.store_id);
    stores.push(
      StoreSchema.parse({
        id: row.data.store_id,
        name: row.data.name,
        chain: row.data.chain,
        address: row.data.address,
        onRouteLabel: row.data.on_route_label,
        detourMinutes: row.data.detour_minutes,
        detourMiles: row.data.detour_miles,
      }),
    );
  }

  const audit = new Map<string, { displayedPrice: number; verification: string; rowNumber: number }>();
  for (const record of auditCsv.records) {
    const row = AuditRowSchema.safeParse(record.values);
    if (!row.success) {
      errors.push(...describeIssues("price-audit.csv", record, row.error));
      continue;
    }
    const v = record.values;
    audit.set(auditKey(v.store_id, v.brand, v.product_name), {
      displayedPrice: row.data.displayed_price,
      verification: row.data.verification_status,
      rowNumber: record.rowNumber,
    });
  }

  const products: Product[] = [];
  const productIds = new Set<string>();
  // Store ids are checked against stores.csv only if it was readable; otherwise every product would be flagged.
  const checkStoreIds = storesCsv.records.length === stores.length;
  for (const record of productsCsv.records) {
    const row = ProductRowSchema.safeParse(record.values);
    if (!row.success) {
      errors.push(...describeIssues("products.csv", record, row.error));
      continue;
    }
    const r = row.data;
    const where = `products.csv row ${record.rowNumber}`;
    if (checkStoreIds && !storeIds.has(r.store_id)) {
      errors.push(`${where}: store_id "${r.store_id}" is not in stores.csv`);
      continue;
    }
    if (r.sale_price !== undefined && r.sale_price >= r.price) {
      errors.push(`${where}: sale_price (${r.sale_price}) must be lower than price (${r.price})`);
      continue;
    }
    const check = audit.get(auditKey(r.store_id, r.brand, r.product_name));
    if (!check) {
      errors.push(`${where}: no matching row in price-audit.csv for "${r.brand} ${r.product_name}" at ${r.store_id}`);
      continue;
    }
    if (check.displayedPrice !== r.price && check.displayedPrice !== r.sale_price) {
      errors.push(
        `${where}: price ${r.price} does not match price-audit.csv row ${check.rowNumber} (displayed_price ${check.displayedPrice})`,
      );
      continue;
    }
    const id = productId(r.store_id, r.brand, r.product_name);
    if (productIds.has(id)) {
      errors.push(`${where}: "${r.brand} ${r.product_name}" at ${r.store_id} appears twice`);
      continue;
    }
    productIds.add(id);
    products.push(
      ProductSchema.parse({
        id,
        storeId: r.store_id,
        brand: r.brand,
        name: r.product_name,
        sizeValue: r.size_value,
        sizeUnit: r.size_unit,
        price: r.price,
        salePrice: r.sale_price,
        category: r.category,
        variant: r.variant,
        groupKey: r.group_key,
        isStoreBrand: r.is_store_brand,
        productUrl: r.product_url,
        loads: r.loads,
        verification: check.verification,
        collectedAt: r.collected_at,
      }),
    );
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, stores, products };
}
