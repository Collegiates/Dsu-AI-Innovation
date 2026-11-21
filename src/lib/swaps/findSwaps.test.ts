import { describe, expect, it } from "vitest";
import { makeProduct } from "@/lib/trip/test-fixtures";
import { findSwaps, productFamily } from "./findSwaps";

const pb = (store: string, brand: string, price: number, size = 16) =>
  makeProduct(store, `${brand} PB ${size}`, price, { brand, category: "pantry", groupKey: "peanut-butter-creamy", variant: "creamy", sizeValue: size });

const usual = pb("walmart", "Jif", 4.0);
const storeBrand = pb("aldi", "Peanut Delight", 1.65);
const otherStoreBrand = pb("walmart", "Great Value", 1.98);

describe("findSwaps", () => {
  it("suggests the cheapest similar product from a different brand, with savings computed by code", () => {
    const [swap] = findSwaps({ basket: [{ usualProductId: usual.id }], products: [usual, storeBrand, otherStoreBrand] });
    expect(swap.to.brand).toBe("Peanut Delight");
    expect(swap.fromCents).toBe(400);
    expect(swap.toCents).toBe(165);
    expect(swap.savingsCents).toBe(235);
    expect(swap.savingsPercent).toBe(59);
    expect(swap.id).toBe(`${usual.id}->${storeBrand.id}`);
  });

  it("respects hidden brands", () => {
    const swaps = findSwaps({ basket: [{ usualProductId: usual.id }], products: [usual, storeBrand, otherStoreBrand], hiddenBrands: ["peanut delight"] });
    expect(swaps[0].to.brand).toBe("Great Value");
  });

  it("respects hidden products", () => {
    const swaps = findSwaps({ basket: [{ usualProductId: usual.id }], products: [usual, storeBrand, otherStoreBrand], hiddenProducts: [storeBrand.id, otherStoreBrand.id] });
    expect(swaps).toEqual([]);
  });

  it("never suggests a more expensive item", () => {
    const pricier = pb("aldi", "Fancy", 5.0);
    expect(findSwaps({ basket: [{ usualProductId: usual.id }], products: [usual, pricier] })).toEqual([]);
  });

  it("never suggests a bigger package that costs more at the register, even if cheaper per ounce", () => {
    const bulk = pb("aldi", "Bulk", 6.0, 48); // 12.5¢/oz vs 25¢/oz, but $6.00 > $4.00 for the 16 oz needed
    expect(findSwaps({ basket: [{ usualProductId: usual.id }], products: [usual, bulk] })).toEqual([]);
  });

  it("gives no swap when nothing is cheaper", () => {
    expect(findSwaps({ basket: [{ usualProductId: storeBrand.id }], products: [usual, storeBrand, otherStoreBrand] })).toEqual([]);
  });

  it("never swaps across product families (yogurt is not swapped for milk)", () => {
    const yogurt = makeProduct("a", "Yogurt", 4, { brand: "Chobani", category: "dairy", groupKey: "yogurt-greek-plain" });
    const milk = makeProduct("a", "Milk", 1, { brand: "Store", category: "dairy", groupKey: "milk-2pct-1gal" });
    expect(productFamily(yogurt)).toBe("dairy:yogurt");
    expect(findSwaps({ basket: [{ usualProductId: yogurt.id }], products: [yogurt, milk] })).toEqual([]);
  });

  it("skips unknown products and an empty basket without crashing", () => {
    expect(findSwaps({ basket: [{ usualProductId: "nope" }], products: [usual] })).toEqual([]);
    expect(findSwaps({ basket: [], products: [usual] })).toEqual([]);
  });

  it("gives the same swap every time, whatever order products come in", () => {
    const twinA = pb("aldi", "Twin A", 1.5);
    const twinB = pb("aldi", "Twin B", 1.5);
    const a = findSwaps({ basket: [{ usualProductId: usual.id }], products: [usual, twinA, twinB] });
    const b = findSwaps({ basket: [{ usualProductId: usual.id }], products: [twinB, usual, twinA] });
    expect(a).toEqual(b);
    expect(a[0].to.id).toBe([twinA.id, twinB.id].sort()[0]);
  });
});
