import type { Product, SizeUnit } from "@/lib/data/schema";
import { effectivePrice, toBaseAmount, unitPrice, type BaseUnit } from "@/lib/pricing/price";

/**
 * One line of the weekly list: the product the shopper usually buys, and how much of it they need.
 * Example: { usualProductId: "walmart-dover--great-value--2-reduced-fat-milk" } means one gallon of that milk.
 * Leave out "amount" to mean one package of the usual product.
 */
export type BasketItem = {
  usualProductId: string;
  amount?: { value: number; unit: SizeUnit };
};

/**
 * The amount to buy for a basket line: the amount given, or one package of the usual product.
 * Example: no amount + a 16 oz peanut butter jar → { value: 16, unit: "oz" }.
 */
export function neededAmount(item: BasketItem, usual: Product): { value: number; unit: SizeUnit } {
  return item.amount ?? { value: usual.sizeValue, unit: usual.sizeUnit };
}

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Decides whether a product can replace the usual one without changing what the shopper gets.
 * Both must share the same product group AND the same variant, and be measured the same way (weight, volume or count).
 * This keeps milk fat %, yogurt type and flavor, cereal flavor, detergent formula and paper towel roll type separate.
 * Example: Honey Nut O's are never a match for plain oat rings, even if both are in the "oat rings" group.
 */
export function isCompatible(usual: Product, candidate: Product): boolean {
  return (
    candidate.groupKey === usual.groupKey &&
    sameText(candidate.variant, usual.variant) &&
    toBaseAmount(1, candidate.sizeUnit).unit === toBaseAmount(1, usual.sizeUnit).unit
  );
}

/**
 * Every product in the catalog that can stand in for the usual one, including the usual product itself.
 * Example: for Great Value 2% milk, this returns 2% milk from every store, but never whole or skim milk.
 */
export function compatibleAlternatives(usual: Product, catalog: readonly Product[]): Product[] {
  return catalog.filter((p) => isCompatible(usual, p));
}

/** Detergents are compared differently because concentration varies between brands. */
const isDetergent = (p: Product) => p.groupKey.startsWith("detergent");

/**
 * The fairest price-per-unit for comparing a product with its alternatives, with a warning when the comparison is rough.
 * Detergents are compared per load when the label lists loads; otherwise per fl oz, flagged "formulas differ",
 * because one brand's fl oz may wash more loads than another's.
 * Example: Tide 84 fl oz, no loads listed → { value: 0.17, per: "fl_oz", note: "formulas differ" }.
 */
export function comparisonPrice(product: Product): { value: number; per: BaseUnit | "load"; note?: "formulas differ" } | null {
  if (isDetergent(product)) {
    if (product.loads) return { value: effectivePrice(product) / product.loads, per: "load" };
    const value = unitPrice(product, "fl_oz");
    return value === null ? null : { value, per: "fl_oz", note: "formulas differ" };
  }
  const per = toBaseAmount(1, product.sizeUnit).unit;
  const value = unitPrice(product, per);
  return value === null ? null : { value, per };
}
