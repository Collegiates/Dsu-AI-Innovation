import type { Product, SizeUnit } from "@/lib/data/schema";
import { toCents } from "./money";

/** The units sizes are converted into before comparing: weight in oz, liquid in fl oz, counts and sheets as-is. */
export type BaseUnit = "oz" | "fl_oz" | "ct" | "sheets";

const CONVERSIONS: Record<SizeUnit, { base: BaseUnit; factor: number }> = {
  oz: { base: "oz", factor: 1 },
  lb: { base: "oz", factor: 16 },
  fl_oz: { base: "fl_oz", factor: 1 },
  gal: { base: "fl_oz", factor: 128 },
  ct: { base: "ct", factor: 1 },
  sheets: { base: "sheets", factor: 1 },
};

/**
 * Converts an amount into its base unit so different package sizes can be compared.
 * Example: toBaseAmount(3, "lb") → { amount: 48, unit: "oz" }; toBaseAmount(1, "gal") → { amount: 128, unit: "fl_oz" }.
 */
export function toBaseAmount(value: number, unit: SizeUnit): { amount: number; unit: BaseUnit } {
  const { base, factor } = CONVERSIONS[unit];
  return { amount: value * factor, unit: base };
}

/**
 * Works out the price per base unit (per oz, per fl oz, per item) so different package sizes can be compared fairly.
 * Example: a 32 oz yogurt for $4.79 costs about $0.15 per oz.
 * Returns null when the product's unit can't be expressed in the unit asked for (ounces of weight are not fluid ounces),
 * so the app never shows a made-up number. Used only to rank and compare, never for totals.
 */
export function unitPrice(product: Pick<Product, "sizeValue" | "sizeUnit" | "price" | "salePrice">, per?: BaseUnit): number | null {
  const size = toBaseAmount(product.sizeValue, product.sizeUnit);
  if (per !== undefined && per !== size.unit) return null;
  if (size.amount <= 0) return null;
  return effectivePrice(product) / size.amount;
}

/**
 * The price the shopper actually pays for one package: the sale price when there is one, otherwise the regular price.
 * Example: price $4.99 with salePrice $3.99 → 3.99.
 */
export function effectivePrice(product: Pick<Product, "price" | "salePrice">): number {
  return product.salePrice ?? product.price;
}

/**
 * How many whole packages to buy to get at least the amount needed. Stores only sell whole packages.
 * Example: needing 20 oz from 16 oz jars → 2 jars. Returns null when the units don't match (e.g. oz vs fl oz).
 */
export function packagesNeeded(needed: { value: number; unit: SizeUnit }, product: Pick<Product, "sizeValue" | "sizeUnit">): number | null {
  const want = toBaseAmount(needed.value, needed.unit);
  const pack = toBaseAmount(product.sizeValue, product.sizeUnit);
  if (want.unit !== pack.unit || pack.amount <= 0) return null;
  if (want.amount <= 0) return 0;
  // The tiny tolerance stops float noise (e.g. 12.200000000000001 / 12.2) from adding a whole extra package.
  return Math.ceil(want.amount / pack.amount - 1e-9);
}

/**
 * What the shopper pays at the register, in cents: whole packages × the price per package.
 * Example: 2 jars at $3.49 → 698. Returns null when the product can't supply the amount needed.
 */
export function checkoutCost(
  needed: { value: number; unit: SizeUnit },
  product: Pick<Product, "sizeValue" | "sizeUnit" | "price" | "salePrice">,
): { packages: number; cents: number } | null {
  const packages = packagesNeeded(needed, product);
  if (packages === null) return null;
  return { packages, cents: packages * toCents(effectivePrice(product)) };
}
