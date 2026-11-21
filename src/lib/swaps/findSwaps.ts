import type { Product } from "@/lib/data/schema";
import { checkoutCost } from "@/lib/pricing/price";
import { comparisonPrice, neededAmount, type BasketItem } from "@/lib/trip/basket";

/**
 * A cheaper similar product suggested in place of one the shopper usually buys. All numbers are computed by code.
 * Example: usual "Pantene Shampoo" $6.35 → swap "Equate Dandruff Shampoo" $2.84, saving 351 cents (55%).
 */
export type Swap = {
  /** Stable id, used to cache the explanation and to hide this swap. Example: "aldi-dover--a--x->walmart-dover--b--y". */
  id: string;
  basketIndex: number;
  from: Product;
  to: Product;
  /** What the shopper pays for the amount they need, in cents, before and after the swap. */
  fromCents: number;
  toCents: number;
  savingsCents: number;
  /** Savings as a whole-number share of the usual cost. Example: 55 means 55%. */
  savingsPercent: number;
  /** Prices per unit (per oz, per fl oz, per item, or per load) used to compare different package sizes. */
  fromUnitPrice: number;
  toUnitPrice: number;
  unit: string;
  /** Set when the comparison is rough, e.g. detergents without a load count. */
  note?: "formulas differ";
};

/**
 * The "family" a product belongs to: its category plus the first word of its group key.
 * Swaps stay inside a family, so yogurt is only swapped for yogurt, never for milk (both are "dairy").
 * Example: groupKey "yogurt-greek-plain-nonfat-32oz" in "dairy" → "dairy:yogurt".
 */
export function productFamily(p: Product): string {
  return `${p.category}:${p.groupKey.split("-")[0]}`;
}

const lower = (s: string) => s.trim().toLowerCase();

/**
 * For each item on the list, finds the cheapest similar product from a different brand that costs less per unit
 * AND less at the register for the amount needed, skipping any brand or product the shopper hid.
 * Deterministic: the same list always gives the same swaps. Items with nothing cheaper get no swap.
 * Example: usual Great Value creamy peanut butter ($1.98) → Peanut Delight creamy ($1.65) at Aldi.
 */
export function findSwaps(input: {
  basket: readonly BasketItem[];
  products: readonly Product[];
  hiddenBrands?: readonly string[];
  hiddenProducts?: readonly string[];
}): Swap[] {
  const hiddenBrands = new Set((input.hiddenBrands ?? []).map(lower));
  const hiddenProducts = new Set(input.hiddenProducts ?? []);
  const byId = new Map(input.products.map((p) => [p.id, p]));
  const swaps: Swap[] = [];

  input.basket.forEach((item, basketIndex) => {
    const from = byId.get(item.usualProductId);
    if (!from) return;
    const needed = neededAmount(item, from);
    const fromCost = checkoutCost(needed, from);
    const fromUnit = comparisonPrice(from);
    if (!fromCost || !fromUnit) return;

    let best: { to: Product; cents: number; unit: number; note?: "formulas differ" } | null = null;
    for (const to of input.products) {
      if (to.id === from.id || lower(to.brand) === lower(from.brand)) continue;
      if (hiddenBrands.has(lower(to.brand)) || hiddenProducts.has(to.id)) continue;
      if (productFamily(to) !== productFamily(from)) continue;
      const toUnit = comparisonPrice(to);
      if (!toUnit || toUnit.per !== fromUnit.per || toUnit.value >= fromUnit.value) continue;
      const toCost = checkoutCost(needed, to);
      // A bigger, cheaper-per-ounce package that costs more at the register is not a saving for this list.
      if (!toCost || toCost.cents >= fromCost.cents) continue;
      const candidate = { to, cents: toCost.cents, unit: toUnit.value, note: toUnit.note ?? fromUnit.note };
      if (!best || candidate.unit < best.unit || (candidate.unit === best.unit && (candidate.cents < best.cents || (candidate.cents === best.cents && to.id < best.to.id)))) {
        best = candidate;
      }
    }
    if (!best) return;

    const savingsCents = fromCost.cents - best.cents;
    swaps.push({
      id: `${from.id}->${best.to.id}`,
      basketIndex,
      from,
      to: best.to,
      fromCents: fromCost.cents,
      toCents: best.cents,
      savingsCents,
      savingsPercent: Math.round((savingsCents / fromCost.cents) * 100),
      fromUnitPrice: fromUnit.value,
      toUnitPrice: best.unit,
      unit: fromUnit.per,
      ...(best.note ? { note: best.note } : {}),
    });
  });
  return swaps;
}
