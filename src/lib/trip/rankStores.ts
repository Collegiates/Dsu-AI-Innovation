import type { Product, Store } from "@/lib/data/schema";
import type { BasketItem } from "./basket";
import { optimizeTrip, type TripPlan } from "./optimizer";

/** One store's whole-list price: the trip if the shopper buys everything there. */
export type StoreQuote = { store: Store; plan: TripPlan; totalCents: number; missing: number };

/** The best single store for this week's list, every store's quote, and what the winner saves. */
export type StoreRanking = {
  winner: StoreQuote | null;
  quotes: StoreQuote[];
  /** Against the runner-up, on only the items both stores sell, so a missing item never looks like a saving. */
  savings: { versus: Store; savingsCents: number; sharedItems: number } | null;
};

/**
 * Picks the one store to shop at this week: each store is priced on the whole list (cheapest matching product at
 * that store), stores that sell more of the list rank first, then the lowest total wins. Pure code, no AI.
 * The saving compares the winner with the runner-up on the items both sell.
 * Example: ALDI $57.34 (all 12 items) beats Walmart (4 of 12 items); ALDI is $1.20 cheaper on those 4.
 */
export function rankStores(basket: readonly BasketItem[], products: readonly Product[], stores: readonly Store[]): StoreRanking {
  const quotes = stores
    .map((store) => {
      const plan = optimizeTrip({ basket, products, stores: [store], preference: "maxSavings" }).recommended;
      return { store, plan, totalCents: plan.checkoutTotalCents, missing: plan.missing.length };
    })
    .filter((q) => q.plan.stops.length > 0)
    .sort((a, b) => a.missing - b.missing || a.totalCents - b.totalCents || a.store.id.localeCompare(b.store.id));

  const [winner, runnerUp] = quotes;
  let savings: StoreRanking["savings"] = null;
  if (winner && runnerUp) {
    const cost = (plan: TripPlan) => new Map(plan.stops.flatMap((s) => s.items).map((i) => [i.basketIndex, i.checkoutCents]));
    const mine = cost(winner.plan);
    const theirs = cost(runnerUp.plan);
    const shared = [...mine.keys()].filter((k) => theirs.has(k));
    const diff = shared.reduce((sum, k) => sum + theirs.get(k)! - mine.get(k)!, 0);
    savings = { versus: runnerUp.store, savingsCents: diff, sharedItems: shared.length };
  }
  return { winner: winner ?? null, quotes, savings };
}
