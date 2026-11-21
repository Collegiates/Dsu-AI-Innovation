import { describe, expect, it } from "vitest";
import { comparisonPrice, compatibleAlternatives, isCompatible, neededAmount } from "./basket";
import { makeProduct } from "./test-fixtures";

const cheerios = makeProduct("walmart", "Cheerios", 4.5, { groupKey: "cereal-oat-rings", variant: "plain oat rings", sizeValue: 12 });
const storeOats = makeProduct("aldi", "Crispy Oats", 2.15, { groupKey: "cereal-oat-rings", variant: "Plain Oat Rings", sizeValue: 12 });
const honeyNut = makeProduct("walmart", "Honey Nut O's", 2.0, { groupKey: "cereal-oat-rings", variant: "honey nut oat rings", sizeValue: 19.5 });

describe("compatible alternatives", () => {
  it("treats the same group and variant as compatible (ignoring letter case)", () => {
    expect(isCompatible(cheerios, storeOats)).toBe(true);
  });

  it("never treats a different variant as compatible: Honey Nut O's are not plain Cheerios", () => {
    expect(isCompatible(cheerios, honeyNut)).toBe(false);
    expect(compatibleAlternatives(cheerios, [cheerios, storeOats, honeyNut]).map((p) => p.name)).toEqual([
      "Cheerios",
      "Crispy Oats",
    ]);
  });

  it("keeps different paper towel roll types apart even when the group key is shared", () => {
    const double = makeProduct("a", "Double Rolls", 9.92, { groupKey: "paper-towels-6roll", variant: "paper towels 6 rolls", sizeUnit: "ct", sizeValue: 6 });
    const triple = makeProduct("a", "Triple Rolls", 8.12, { groupKey: "paper-towels-6roll", variant: "paper towels 6 rolls triple", sizeUnit: "ct", sizeValue: 6 });
    expect(isCompatible(double, triple)).toBe(false);
  });

  it("never matches weight ounces with fluid ounces", () => {
    const byWeight = makeProduct("a", "Shampoo A", 6, { groupKey: "shampoo", variant: "moisture", sizeUnit: "oz" });
    const byVolume = makeProduct("b", "Shampoo B", 3, { groupKey: "shampoo", variant: "moisture", sizeUnit: "fl_oz" });
    expect(isCompatible(byWeight, byVolume)).toBe(false);
  });
});

describe("neededAmount", () => {
  it("defaults to one package of the usual product", () => {
    expect(neededAmount({ usualProductId: cheerios.id }, cheerios)).toEqual({ value: 12, unit: "oz" });
  });

  it("uses the amount given", () => {
    expect(neededAmount({ usualProductId: cheerios.id, amount: { value: 30, unit: "oz" } }, cheerios)).toEqual({ value: 30, unit: "oz" });
  });
});

describe("comparisonPrice", () => {
  const detergent = (loads?: number) =>
    makeProduct("a", "Detergent", 12.8, { groupKey: "detergent-liquid", variant: "original", sizeValue: 64, sizeUnit: "fl_oz", loads });

  it("compares detergent per load when the label lists loads", () => {
    expect(comparisonPrice(detergent(32))).toEqual({ value: 0.4, per: "load" });
  });

  it("falls back to per fl oz for detergent without loads, flagged 'formulas differ'", () => {
    expect(comparisonPrice(detergent())).toEqual({ value: 0.2, per: "fl_oz", note: "formulas differ" });
  });

  it("compares everything else per base unit with no warning", () => {
    expect(comparisonPrice(storeOats)).toEqual({ value: 2.15 / 12, per: "oz" });
  });
});
