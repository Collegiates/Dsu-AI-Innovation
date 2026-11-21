import { describe, expect, it } from "vitest";
import { checkoutCost, effectivePrice, packagesNeeded, toBaseAmount, unitPrice } from "./price";

describe("unitPrice", () => {
  it("converts gallons to fluid ounces", () => {
    // $3.84 for 1 gal = 128 fl oz → 3 cents per fl oz
    expect(unitPrice({ sizeValue: 1, sizeUnit: "gal", price: 3.84 }, "fl_oz")).toBeCloseTo(0.03);
  });

  it("converts pounds to ounces", () => {
    // $9.60 for 3 lb = 48 oz → 20 cents per oz
    expect(unitPrice({ sizeValue: 3, sizeUnit: "lb", price: 9.6 }, "oz")).toBeCloseTo(0.2);
  });

  it("gives the same per-oz price for 3 lb and 48 oz packages at the same price", () => {
    const pounds = unitPrice({ sizeValue: 3, sizeUnit: "lb", price: 9.89 });
    const ounces = unitPrice({ sizeValue: 48, sizeUnit: "oz", price: 9.89 });
    expect(pounds).toBeCloseTo(ounces!);
  });

  it("returns null when asked for an incompatible unit (weight oz vs fluid oz)", () => {
    expect(unitPrice({ sizeValue: 12, sizeUnit: "oz", price: 6 }, "fl_oz")).toBeNull();
    expect(unitPrice({ sizeValue: 6, sizeUnit: "ct", price: 6 }, "oz")).toBeNull();
  });

  it("uses the sale price when there is one", () => {
    expect(unitPrice({ sizeValue: 10, sizeUnit: "oz", price: 5, salePrice: 4 }, "oz")).toBeCloseTo(0.4);
  });
});

describe("effectivePrice", () => {
  it("uses the sale price when present", () => {
    expect(effectivePrice({ price: 4.99, salePrice: 3.99 })).toBe(3.99);
  });

  it("uses the regular price when there is no sale", () => {
    expect(effectivePrice({ price: 4.99 })).toBe(4.99);
  });
});

describe("packagesNeeded and checkoutCost", () => {
  it("buys 2 jars when 20 oz is needed from 16 oz jars, and charges for both", () => {
    const jar = { sizeValue: 16, sizeUnit: "oz" as const, price: 3.49 };
    expect(packagesNeeded({ value: 20, unit: "oz" }, jar)).toBe(2);
    expect(checkoutCost({ value: 20, unit: "oz" }, jar)).toEqual({ packages: 2, cents: 698 });
  });

  it("buys exactly one package when the amount matches, despite float noise", () => {
    expect(packagesNeeded({ value: 12.2, unit: "oz" }, { sizeValue: 12.2, sizeUnit: "oz" })).toBe(1);
  });

  it("covers a 32 oz need with one 3 lb bag", () => {
    expect(packagesNeeded({ value: 32, unit: "oz" }, { sizeValue: 3, sizeUnit: "lb" })).toBe(1);
  });

  it("charges the sale price per package", () => {
    expect(checkoutCost({ value: 2, unit: "ct" }, { sizeValue: 1, sizeUnit: "ct", price: 2, salePrice: 1.5 })).toEqual({
      packages: 2,
      cents: 300,
    });
  });

  it("returns null when the units can't be compared", () => {
    expect(packagesNeeded({ value: 1, unit: "gal" }, { sizeValue: 16, sizeUnit: "oz" })).toBeNull();
    expect(checkoutCost({ value: 1, unit: "gal" }, { sizeValue: 16, sizeUnit: "oz", price: 3 })).toBeNull();
  });

  it("adds whole cents exactly (no 3.2700000000000005)", () => {
    expect(checkoutCost({ value: 48, unit: "oz" }, { sizeValue: 16, sizeUnit: "oz", price: 1.09 })?.cents).toBe(327);
  });
});

describe("toBaseAmount", () => {
  it("leaves counts as counts", () => {
    expect(toBaseAmount(6, "ct")).toEqual({ amount: 6, unit: "ct" });
  });
});
