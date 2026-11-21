import { z } from "zod";
import { inputLimits } from "@/lib/config/app";
import type { Product } from "@/lib/data/schema";
import type { MatchResult } from "@/lib/matching/core";
import type { BasketItem } from "@/lib/trip/basket";

/** The most packages of one item the quantity stepper allows. */
export const MAX_QUANTITY = 20;

/**
 * One line of the shopper's saved list: what they typed, how many, and the product it was matched to.
 * productId is null when nothing in the catalog matched, so the line is kept and shown but never priced.
 * Example: { text: "2% milk", quantity: 2, label: "Same product", productId: "walmart-dover--great-value--2-reduced-fat-milk" }.
 */
export const ListEntrySchema = z
  .object({
    text: z.string().trim().min(1).max(inputLimits.maxItemChars),
    quantity: z.number().int().min(1).max(MAX_QUANTITY),
    label: z.enum(["Same product", "Similar", "No match"]),
    productId: z.string().trim().min(1).max(200).nullable(),
  })
  .strict();
export type ListEntry = z.infer<typeof ListEntrySchema>;

/**
 * Splits typed list text into separate items: one per line or separated by commas, with extra spaces removed,
 * blank lines and repeats dropped, each cut to 100 characters, and at most 100 items.
 * Example: "milk, eggs\n\n Eggs \nbread" → ["milk", "eggs", "bread"].
 */
export function parseListText(text: string): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const part of text.split(/[\n,]/)) {
    const item = part.replace(/\s+/g, " ").trim().slice(0, inputLimits.maxItemChars).trim();
    if (!item || seen.has(item.toLowerCase())) continue;
    seen.add(item.toLowerCase());
    items.push(item);
    if (items.length === inputLimits.maxListItems) break;
  }
  return items;
}

/**
 * Turns match results into saved list lines. Each line gets the usual store's product when that store sells a match,
 * otherwise the cheapest-per-unit match. Quantities from the previous list are kept for lines typed the same way.
 * Example: "2% milk" matched at ALDI and Walmart, usual store Walmart → the Walmart milk.
 */
export function entriesFromMatches(results: readonly MatchResult[], usualStoreId: string, previous: readonly ListEntry[] = []): ListEntry[] {
  const quantities = new Map(previous.map((e) => [e.text.toLowerCase(), e.quantity]));
  return results.map((r) => {
    const product = r.label === "No match" ? null : (r.options.find((p) => p.storeId === usualStoreId) ?? r.options[0] ?? r.best);
    return {
      text: r.input,
      quantity: quantities.get(r.input.toLowerCase()) ?? 1,
      label: product ? r.label : "No match",
      productId: product?.id ?? null,
    };
  });
}

/**
 * Builds the trip planner's basket from the saved list. A quantity of 2 means twice the usual package size.
 * Lines with no match (or whose product is no longer in the catalog) are returned as "unmatched" and never priced.
 * entryIndexes[i] says which list line basket[i] came from, so a swap can update the right line.
 * Example: [{ text: "milk", quantity: 2, productId: <1 gal milk> }] → basket [{ usualProductId, amount: 2 gal }].
 */
export function basketFromEntries(
  entries: readonly ListEntry[],
  productsById: ReadonlyMap<string, Product>,
): { basket: BasketItem[]; entryIndexes: number[]; unmatched: string[] } {
  const basket: BasketItem[] = [];
  const entryIndexes: number[] = [];
  const unmatched: string[] = [];
  entries.forEach((entry, index) => {
    const product = entry.productId ? productsById.get(entry.productId) : undefined;
    if (!product) {
      unmatched.push(entry.text);
      return;
    }
    basket.push(
      entry.quantity > 1
        ? { usualProductId: product.id, amount: { value: product.sizeValue * entry.quantity, unit: product.sizeUnit } }
        : { usualProductId: product.id },
    );
    entryIndexes.push(index);
  });
  return { basket, entryIndexes, unmatched };
}

/**
 * Changes how many of one list line to buy, kept between 1 and 20. Returns a new list; the old one is untouched.
 * Example: setQuantity(list, 0, 3) sets the first line to 3 packages.
 */
export function setQuantity(entries: readonly ListEntry[], index: number, quantity: number): ListEntry[] {
  const q = Math.min(MAX_QUANTITY, Math.max(1, Math.round(quantity)));
  return entries.map((e, i) => (i === index ? { ...e, quantity: q } : e));
}

/**
 * Puts a different product on one list line (used by "Try it" on Smart Swaps). Returns a new list.
 * Example: replaceProduct(list, 3, "aldi-dover--peanut-delight--creamy-peanut-butter").
 */
export function replaceProduct(entries: readonly ListEntry[], index: number, productId: string): ListEntry[] {
  return entries.map((e, i) => (i === index ? { ...e, productId } : e));
}
