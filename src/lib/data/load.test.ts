import { describe, expect, it } from "vitest";
import { makeProduct, makeStore } from "@/lib/trip/test-fixtures";
import { parseCatalog } from "./load";

describe("parseCatalog", () => {
  it("returns stores, products and a lookup by id for valid data", () => {
    const store = makeStore("aldi-dover", 4, 1);
    const product = makeProduct("aldi-dover", "Milk", 2.99);
    const catalog = parseCatalog([store], [product]);
    expect(catalog.stores).toEqual([store]);
    expect(catalog.productsById.get(product.id)).toEqual(product);
  });

  it("fails loudly on invalid data instead of continuing", () => {
    const bad = { ...makeProduct("aldi-dover", "Milk", 2.99), price: -1 };
    expect(() => parseCatalog([makeStore("aldi-dover", 4, 1)], [bad])).toThrow(/products\.json \[0\.price\]/);
  });

  it("fails on a store with a missing detour", () => {
    const noDetour: Record<string, unknown> = { ...makeStore("aldi-dover", 4, 1) };
    delete noDetour.detourMinutes;
    expect(() => parseCatalog([noDetour], [])).toThrow(/stores\.json \[0\.detourMinutes\]/);
  });

  it("fails when a product points at a store that doesn't exist, or an id repeats", () => {
    const p = makeProduct("ghost-store", "Milk", 2.99);
    expect(() => parseCatalog([makeStore("aldi-dover", 4, 1)], [p])).toThrow(/unknown store "ghost-store"/);
    const q = makeProduct("aldi-dover", "Milk", 2.99);
    expect(() => parseCatalog([makeStore("aldi-dover", 4, 1)], [q, q])).toThrow(/used twice/);
  });
});
