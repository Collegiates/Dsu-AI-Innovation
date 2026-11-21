import { z } from "zod";
import type { Product } from "@/lib/data/schema";
import { toCents } from "@/lib/pricing/money";
import { effectivePrice } from "@/lib/pricing/price";

/** The share a price must fall, compared with before, to count as a deal. 0.10 = 10%. */
export const MIN_DROP = 0.1;

/**
 * Something bought now and then (toothpaste, shampoo) that the shopper wants to buy when it's cheap.
 * Example: { groupKey: "paper-towels-6roll", targetPrice: 7.5 } means "tell me when 6-roll paper towels are $7.50 or less".
 */
export const WaitlistItemSchema = z
  .object({ groupKey: z.string().trim().min(1).max(100), targetPrice: z.number().positive().max(10_000).optional() })
  .strict();
export type WaitlistItem = z.infer<typeof WaitlistItemSchema>;

/** A waitlist item that is now cheap enough to buy, with where to buy it and how much is saved. */
export type Deal = {
  groupKey: string;
  product: Product;
  storeId: string;
  currentCents: number;
  /** The same product's price before, or null if it wasn't sold before. */
  previousCents: number | null;
  /** previousCents − currentCents (0 when there's no earlier price). */
  savedCents: number;
  /** Whole-number percentage drop, or null with no earlier price. Example: 16 means 16% cheaper. */
  dropPercent: number | null;
  /** Why it's a deal: the price fell at least 10%, and/or it reached the shopper's target. */
  reasons: ("price-drop" | "target")[];
  targetCents?: number;
};

/**
 * Finds waitlist items that are worth buying now: the same product's price fell at least 10% since before,
 * or it is at or below the shopper's target price. For each waitlist item, the cheapest such product is returned.
 * Example: Tide Free & Gentle $14.29 → $11.99 is a 16% drop, so it's a deal saving 230 cents.
 */
export function detectDeals(waitlist: readonly WaitlistItem[], current: readonly Product[], previous: readonly Product[]): Deal[] {
  const before = new Map(previous.map((p) => [p.id, toCents(effectivePrice(p))]));
  const deals: Deal[] = [];

  for (const item of waitlist) {
    const targetCents = item.targetPrice !== undefined ? toCents(item.targetPrice) : undefined;
    let best: Deal | null = null;
    for (const product of current) {
      if (product.groupKey !== item.groupKey) continue;
      const currentCents = toCents(effectivePrice(product));
      const previousCents = before.get(product.id) ?? null;
      const reasons: Deal["reasons"] = [];
      // Compared in whole cents so a drop of exactly 10% counts.
      if (previousCents !== null && previousCents - currentCents >= Math.round(previousCents * MIN_DROP)) reasons.push("price-drop");
      if (targetCents !== undefined && currentCents <= targetCents) reasons.push("target");
      if (reasons.length === 0) continue;
      const deal: Deal = {
        groupKey: item.groupKey,
        product,
        storeId: product.storeId,
        currentCents,
        previousCents,
        savedCents: previousCents !== null ? Math.max(0, previousCents - currentCents) : 0,
        dropPercent: previousCents ? Math.round(((previousCents - currentCents) / previousCents) * 100) : null,
        reasons,
        ...(targetCents !== undefined ? { targetCents } : {}),
      };
      if (!best || deal.currentCents < best.currentCents || (deal.currentCents === best.currentCents && product.id < best.product.id)) best = deal;
    }
    if (best) deals.push(best);
  }
  return deals;
}
