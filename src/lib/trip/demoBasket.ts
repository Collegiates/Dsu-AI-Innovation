import type { Product } from "@/lib/data/schema";
import { matchWithKeywords } from "@/lib/matching/core";
import type { BasketItem } from "./basket";

/**
 * Turns typed list lines into a basket of the shopper's usual products: each line is matched to a product group,
 * and the usual store's product in that group is picked (or the cheapest per unit if the usual store doesn't sell it).
 * Lines with no match are returned separately so the app can say so instead of guessing.
 * Example: ["2% milk", "lawn mower"] at Walmart → basket [Great Value 2% milk], unmatched ["lawn mower"].
 */
export function basketFromList(lines: readonly string[], products: readonly Product[], usualStoreId: string): { basket: BasketItem[]; unmatched: string[] } {
  const basket: BasketItem[] = [];
  const unmatched: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const match = matchWithKeywords(line, products);
    const usual = match.options.find((p) => p.storeId === usualStoreId) ?? match.options[0];
    if (match.label === "No match" || !usual) {
      unmatched.push(line);
      continue;
    }
    if (seen.has(usual.id)) continue;
    seen.add(usual.id);
    basket.push({ usualProductId: usual.id });
  }
  return { basket, unmatched };
}
