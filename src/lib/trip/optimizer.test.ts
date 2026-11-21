import { describe, expect, it } from "vitest";
import { MAX_STORES, optimizeTrip } from "./optimizer";
import { makeProduct, makeStore } from "./test-fixtures";

// Usual store is on the way home (no detour); Aldi adds a small detour.
const walmart = makeStore("walmart-dover", 0, 0);
const aldi = makeStore("aldi-dover", 4, 1);

describe("trip optimizer", () => {
  it("keeps one stop when splitting saves less than the cost of the extra stop", () => {
    // Aldi milk is 20 cents cheaper, but under "balanced" the detour and extra stop cost far more than that.
    const products = [
      makeProduct("walmart-dover", "Milk", 3.0, { groupKey: "milk" }),
      makeProduct("aldi-dover", "Milk", 2.8, { groupKey: "milk" }),
      makeProduct("walmart-dover", "Eggs", 2.0, { groupKey: "eggs" }),
    ];
    const result = optimizeTrip({
      basket: [{ usualProductId: "walmart-dover--milk" }, { usualProductId: "walmart-dover--eggs" }],
      products,
      stores: [walmart, aldi],
      preference: "balanced",
    });
    expect(result.recommended.storeIds).toEqual(["walmart-dover"]);
    expect(result.recommended.checkoutTotalCents).toBe(500);
  });

  it("splits across two stores under 'maxSavings' when the split clearly saves money", () => {
    const products = [
      makeProduct("walmart-dover", "Coffee", 9.0, { groupKey: "coffee" }),
      makeProduct("aldi-dover", "Coffee", 5.0, { groupKey: "coffee" }),
      makeProduct("walmart-dover", "Toothpaste", 2.0, { groupKey: "toothpaste" }),
      makeProduct("aldi-dover", "Toothpaste", 4.5, { groupKey: "toothpaste" }),
    ];
    const result = optimizeTrip({
      basket: [{ usualProductId: "walmart-dover--coffee" }, { usualProductId: "walmart-dover--toothpaste" }],
      products,
      stores: [walmart, aldi],
      preference: "maxSavings",
    });
    const plan = result.recommended;
    expect(plan.storeIds).toEqual(["walmart-dover", "aldi-dover"]);
    expect(plan.stops.map((s) => [s.store.id, s.subtotalCents])).toEqual([
      ["walmart-dover", 200],
      ["aldi-dover", 500],
    ]);
    expect(plan.checkoutTotalCents).toBe(700);
    expect(plan.gasCostCents).toBe(15); // 1 mile × $0.15
    expect(plan.extraMinutes).toBe(14); // 4-minute detour + 10 minutes for the extra stop
    expect(plan.timeCostCents).toBe(0); // time is free under maxSavings
    expect(plan.savingsCents).toBe(1100 - 715); // baseline $11.00 vs $7.00 + $0.15 gas
  });

  it("measures savings against the usual products at the usual store, not the cheapest option there", () => {
    // The shopper usually buys a $4.00 name brand; Walmart also sells a compatible store brand for $2.50.
    const products = [
      makeProduct("walmart-dover", "Name Brand PB", 4.0, { groupKey: "pb", variant: "creamy" }),
      makeProduct("walmart-dover", "Store Brand PB", 2.5, { groupKey: "pb", variant: "creamy", isStoreBrand: true }),
      makeProduct("aldi-dover", "Aldi PB", 2.0, { groupKey: "pb", variant: "creamy", isStoreBrand: true }),
    ];
    const result = optimizeTrip({
      basket: [{ usualProductId: "walmart-dover--name-brand-pb" }],
      products,
      stores: [walmart, aldi],
      preference: "fastest",
    });
    expect(result.baseline.checkoutTotalCents).toBe(400);
    expect(result.recommended.storeIds).toEqual(["walmart-dover"]);
    expect(result.recommended.stops[0].items[0].product.name).toBe("Store Brand PB");
    expect(result.recommended.stops[0].items[0].isSubstitute).toBe(true);
    expect(result.recommended.savingsCents).toBe(150);
  });

  it("never buys a different variant, even when it is cheaper", () => {
    const products = [
      makeProduct("walmart-dover", "Cheerios", 4.5, { groupKey: "cereal-oat-rings", variant: "plain" }),
      makeProduct("walmart-dover", "Honey Nut O's", 1.0, { groupKey: "cereal-oat-rings", variant: "honey nut" }),
    ];
    const result = optimizeTrip({
      basket: [{ usualProductId: "walmart-dover--cheerios" }],
      products,
      stores: [walmart],
      preference: "maxSavings",
    });
    expect(result.recommended.stops[0].items[0].product.name).toBe("Cheerios");
  });

  it("buys whole packages: 20 oz from 16 oz jars costs 2 jars", () => {
    const products = [makeProduct("walmart-dover", "Jam", 3.49, { sizeValue: 16, sizeUnit: "oz" })];
    const result = optimizeTrip({
      basket: [{ usualProductId: "walmart-dover--jam", amount: { value: 20, unit: "oz" } }],
      products,
      stores: [walmart],
      preference: "balanced",
    });
    const item = result.recommended.stops[0].items[0];
    expect(item.packages).toBe(2);
    expect(item.checkoutCents).toBe(698);
  });

  it("uses the sale price when present", () => {
    const products = [makeProduct("walmart-dover", "Rice", 3.0, { salePrice: 2.25 })];
    const result = optimizeTrip({ basket: [{ usualProductId: "walmart-dover--rice" }], products, stores: [walmart], preference: "balanced" });
    expect(result.recommended.checkoutTotalCents).toBe(225);
  });

  it("reports an item no store carries as missing, never priced at $0", () => {
    const products = [
      makeProduct("walmart-dover", "Bread", 2.0, { groupKey: "bread" }),
      // Sold only at a store that isn't on the route.
      makeProduct("far-away", "Saffron", 12.0, { groupKey: "saffron", brand: "Fancy" }),
    ];
    const result = optimizeTrip({
      basket: [{ usualProductId: "walmart-dover--bread" }, { usualProductId: "far-away--saffron" }],
      products,
      stores: [walmart, aldi],
      preference: "balanced",
    });
    const plan = result.recommended;
    expect(plan.missing).toEqual([{ basketIndex: 1, usualProductId: "far-away--saffron", label: "Fancy Saffron" }]);
    expect(plan.checkoutTotalCents).toBe(200);
    const bought = plan.stops.flatMap((s) => s.items);
    expect(bought.map((i) => i.product.name)).toEqual(["Bread"]);
    expect(bought.every((i) => i.checkoutCents > 0)).toBe(true);
    // The missing item is left out of the savings comparison instead of counting as a $12 saving.
    expect(plan.savingsCents).toBe(0);
  });

  it("reports an unknown product id as missing", () => {
    const result = optimizeTrip({ basket: [{ usualProductId: "nope" }], products: [], stores: [walmart], preference: "balanced" });
    expect(result.recommended.missing).toEqual([{ basketIndex: 0, usualProductId: "nope", label: "nope" }]);
    expect(result.recommended.stops).toEqual([]);
  });

  it("prefers a plan that gets everything, even if a cheaper plan misses an item", () => {
    const products = [
      makeProduct("walmart-dover", "Milk", 3.0, { groupKey: "milk" }),
      makeProduct("aldi-dover", "Kale", 2.0, { groupKey: "kale" }),
    ];
    const result = optimizeTrip({
      basket: [{ usualProductId: "walmart-dover--milk" }, { usualProductId: "aldi-dover--kale" }],
      products,
      stores: [walmart, aldi],
      preference: "fastest",
    });
    expect(result.recommended.missing).toEqual([]);
    expect(result.recommended.storeIds).toEqual(["walmart-dover", "aldi-dover"]);
  });

  it("returns an empty plan for an empty basket without crashing", () => {
    const result = optimizeTrip({ basket: [], products: [], stores: [walmart, aldi], preference: "balanced" });
    expect(result.recommended.stops).toEqual([]);
    expect(result.recommended.checkoutTotalCents).toBe(0);
    expect(result.recommended.missing).toEqual([]);
    expect(result.cheapestSingleStore).toBeNull();
    expect(result.fastest).toBeNull();
  });

  it("breaks ties the same way every time, whatever order the stores come in", () => {
    // Two identical stores with identical prices: the result must not depend on input order.
    const twinA = makeStore("store-a", 3, 1);
    const twinB = makeStore("store-b", 3, 1);
    const products = [
      makeProduct("store-a", "Pasta", 1.25, { groupKey: "pasta" }),
      makeProduct("store-b", "Pasta", 1.25, { groupKey: "pasta" }),
    ];
    const run = (stores: typeof twinA[]) =>
      optimizeTrip({ basket: [{ usualProductId: "store-a--pasta" }], products, stores, preference: "balanced", usualStoreId: "store-a" });
    const first = run([twinA, twinB]);
    expect(run([twinB, twinA])).toEqual(first);
    expect(run([twinA, twinB])).toEqual(first);
    expect(first.recommended.storeIds).toEqual(["store-a"]);
  });

  it("returns the cheapest single store and the fastest plan for comparison", () => {
    const products = [
      makeProduct("walmart-dover", "Milk", 3.46, { groupKey: "milk" }),
      makeProduct("aldi-dover", "Milk", 2.99, { groupKey: "milk" }),
    ];
    const result = optimizeTrip({
      basket: [{ usualProductId: "walmart-dover--milk" }],
      products,
      stores: [walmart, aldi],
      preference: "fastest",
    });
    expect(result.fastest?.storeIds).toEqual(["walmart-dover"]);
    expect(result.cheapestSingleStore?.storeIds).toEqual(["aldi-dover"]);
    expect(result.cheapestSingleStore?.savingsCents).toBe(346 - 299 - 15);
  });

  it("flags a detergent swap as 'formulas differ' when loads aren't listed", () => {
    const products = [
      makeProduct("walmart-dover", "Tide", 14.29, { groupKey: "detergent-liquid", variant: "original", sizeUnit: "fl_oz", sizeValue: 84 }),
      makeProduct("walmart-dover", "Store Detergent", 6.05, { groupKey: "detergent-liquid", variant: "original", sizeUnit: "fl_oz", sizeValue: 84 }),
    ];
    const result = optimizeTrip({ basket: [{ usualProductId: "walmart-dover--tide" }], products, stores: [walmart], preference: "balanced" });
    expect(result.recommended.stops[0].items[0].note).toBe("formulas differ");
  });

  it(`refuses more than ${MAX_STORES} stores`, () => {
    const stores = Array.from({ length: MAX_STORES + 1 }, (_, i) => makeStore(`s${i}`, 1, 1));
    expect(() => optimizeTrip({ basket: [], products: [], stores, preference: "balanced" })).toThrow(/at most 5 stores/);
  });
});
