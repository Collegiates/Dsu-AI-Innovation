import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { importCatalog, productId } from "./import";

const STORES_HEADER = "store_id,name,chain,address,on_route_label,detour_minutes,detour_miles";
const PRODUCTS_HEADER =
  "store_id,brand,product_name,size_value,size_unit,price,sale_price,category,variant,group_key,is_store_brand,product_url,collected_at";
const AUDIT_HEADER = "store_id,brand,product_name,displayed_price,source_url,verification_status,checked_date,notes";

const storeRow = (id: string, minutes = "4", miles = "1.2") => `${id},Store ${id},Chain,"1 Main St, Dover, DE 19901",On your route,${minutes},${miles}`;
const productRow = (store: string, name: string, price = "2.99", extra: Partial<Record<"size_unit" | "sale_price" | "group_key", string>> = {}) =>
  `${store},Brand,${name},1,${extra.size_unit ?? "gal"},${price},${extra.sale_price ?? ""},dairy,2% milk,${extra.group_key ?? "milk-2pct-1gal"},true,https://example.com/p,2026-11-21`;
const auditRow = (store: string, name: string, price = "2.99") => `${store},Brand,${name},${price},https://example.com/p,RETAILER_ONLINE_PRICE,2026-11-21,note`;

const files = (stores: string[], products: string[], audit: string[]) => ({
  storesCsv: [STORES_HEADER, ...stores].join("\n"),
  productsCsv: [PRODUCTS_HEADER, ...products].join("\n"),
  auditCsv: [AUDIT_HEADER, ...audit].join("\n"),
});

describe("parseCsv", () => {
  it("keeps commas inside quoted cells and remembers line numbers", () => {
    expect(parseCsv('a,"b, c"\n\n1,"say ""hi"""\r\n')).toEqual([
      { line: 1, cells: ["a", "b, c"] },
      { line: 3, cells: ["1", 'say "hi"'] },
    ]);
  });
});

describe("importCatalog", () => {
  it("turns valid rows into stores and products with stable ids and audit status", () => {
    const result = importCatalog(files([storeRow("aldi-dover")], [productRow("aldi-dover", "Milk")], [auditRow("aldi-dover", "Milk")]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.stores[0]).toMatchObject({ id: "aldi-dover", address: "1 Main St, Dover, DE 19901", detourMinutes: 4, detourMiles: 1.2 });
    expect(result.products[0]).toMatchObject({
      id: "aldi-dover--brand--milk",
      sizeUnit: "gal",
      price: 2.99,
      groupKey: "milk-2pct-1gal",
      isStoreBrand: true,
      verification: "RETAILER_ONLINE_PRICE",
    });
    expect(result.products[0].salePrice).toBeUndefined();
  });

  it("rejects a blank detour with the row number, instead of treating it as 0", () => {
    const result = importCatalog(files([storeRow("walmart-dover"), storeRow("aldi-dover", "", "")], [], []));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      "stores.csv row 3: detour_minutes is blank (a blank is never treated as 0)",
      "stores.csv row 3: detour_miles is blank (a blank is never treated as 0)",
    ]);
  });

  it("rejects invalid product rows with the row number and the bad value", () => {
    const result = importCatalog(
      files(
        [storeRow("aldi-dover")],
        [productRow("aldi-dover", "Milk"), productRow("aldi-dover", "Eggs", "abc"), productRow("aldi-dover", "Cream", "2.00", { size_unit: "liters" })],
        [auditRow("aldi-dover", "Milk"), auditRow("aldi-dover", "Eggs"), auditRow("aldi-dover", "Cream", "2.00")],
      ),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toBe('products.csv row 3: price is not a number (got "abc")');
    expect(result.errors[1]).toMatch(/^products\.csv row 4: size_unit .*\(got "liters"\)$/);
  });

  it("rejects a blank group key, a zero price and a sale price above the price", () => {
    const result = importCatalog(
      files(
        [storeRow("aldi-dover")],
        [
          productRow("aldi-dover", "A", "2.99", { group_key: "" }),
          productRow("aldi-dover", "B", "0.00"),
          productRow("aldi-dover", "C", "2.99", { sale_price: "3.50" }),
        ],
        [auditRow("aldi-dover", "A"), auditRow("aldi-dover", "B", "0.00"), auditRow("aldi-dover", "C")],
      ),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      "products.csv row 2: group_key is blank",
      'products.csv row 3: price must be more than 0 (got "0.00")',
      "products.csv row 4: sale_price (3.5) must be lower than price (2.99)",
    ]);
  });

  it("rejects products at unknown stores, duplicates, and prices that don't match the audit", () => {
    const result = importCatalog(
      files(
        [storeRow("aldi-dover")],
        [productRow("target-dover", "Milk"), productRow("aldi-dover", "Milk"), productRow("aldi-dover", "Milk"), productRow("aldi-dover", "Eggs", "1.85"), productRow("aldi-dover", "Bread")],
        [auditRow("target-dover", "Milk"), auditRow("aldi-dover", "Milk"), auditRow("aldi-dover", "Eggs", "1.99")],
      ),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      'products.csv row 2: store_id "target-dover" is not in stores.csv',
      'products.csv row 4: "Brand Milk" at aldi-dover appears twice',
      "products.csv row 5: price 1.85 does not match price-audit.csv row 4 (displayed_price 1.99)",
      'products.csv row 6: no matching row in price-audit.csv for "Brand Bread" at aldi-dover',
    ]);
  });

  it("reports missing columns", () => {
    const result = importCatalog({ storesCsv: "store_id,name\nx,y", productsCsv: PRODUCTS_HEADER, auditCsv: AUDIT_HEADER });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain('stores.csv: missing column "detour_minutes"');
  });
});

describe("productId", () => {
  it("builds the id from store, brand and name", () => {
    expect(productId("aldi-dover", "L'oven Fresh", "100% Whole Wheat Bread")).toBe("aldi-dover--loven-fresh--100-whole-wheat-bread");
    expect(productId("walmart-dover", "Head & Shoulders", "Classic Clean")).toBe("walmart-dover--head-and-shoulders--classic-clean");
  });
});
