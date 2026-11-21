import "server-only";
import { connection } from "next/server";
import type { TripPreference } from "@/lib/config/app";
import { DEMO_WAITLIST, DEMO_WEEKLY_LIST } from "@/lib/config/demo";
import { tryLoadCatalog } from "@/lib/data/load";
import type { Store } from "@/lib/data/schema";
import { detectDeals, type Deal } from "@/lib/deals/detectDeals";
import { matchRecalls, type RecallMatch } from "@/lib/recalls/match";
import { fetchRecalls } from "@/lib/recalls/openfda";
import { basketFromList } from "@/lib/trip/demoBasket";
import { DEFAULT_USUAL_STORE_ID, optimizeTrip, type TripResult } from "@/lib/trip/optimizer";
import { rankStores, type StoreRanking } from "@/lib/trip/rankStores";
import { findSwaps } from "@/lib/swaps/findSwaps";

/** Everything the Dashboard shows, all computed by code from the real data files. */
export type DashboardData = {
  trip: TripResult;
  /** The one store to shop at this week, and every store's whole-list total. */
  ranking: StoreRanking;
  /** Weekly savings of each swap available at the winning store, in cents. */
  swapSavingsCents: number[];
  stores: Store[];
  /** Stores that have collected prices; the others are shown as "Prices coming soon". */
  pricedStoreIds: string[];
  itemCount: number;
  unmatched: string[];
  recall: RecallMatch | null;
  recallCount: number;
  deals: Deal[];
};

/**
 * Gathers the Dashboard's numbers: plans this week's trip for the demo list with the real optimizer,
 * checks the planned products against recalls, and checks the Deal Watch waitlist for price drops.
 * Returns a plain-language error instead of throwing if the store data isn't ready.
 * Example: { ok: true, data: { trip: { recommended: { storeIds: ["walmart-dover"] ... } } } }.
 */
export async function getDashboardData(preference: TripPreference = "balanced"): Promise<{ ok: true; data: DashboardData } | { ok: false; message: string }> {
  // Wait for a real request, so prices and recalls are read when the page is opened, not frozen at build time.
  await connection();
  const loaded = tryLoadCatalog();
  if (!loaded.ok) return loaded;
  const { products, stores, productsById } = loaded.catalog;
  const { basket, unmatched } = basketFromList(DEMO_WEEKLY_LIST, products, DEFAULT_USUAL_STORE_ID);
  const trip = optimizeTrip({ basket, products, stores, preference, usualStoreId: DEFAULT_USUAL_STORE_ID });
  // One trip a week to one store: the winner is the store with the most of the list at the lowest total.
  const ranking = rankStores(basket, products, stores);
  const swapSavingsCents = findSwaps({ basket, products })
    .filter((s) => s.to.storeId === ranking.winner?.store.id)
    .map((s) => s.savingsCents);

  // Check what the shopper will actually buy, plus their usual products.
  const checked = new Map((ranking.winner?.plan.stops ?? []).flatMap((s) => s.items.map((i) => [i.product.id, i.product] as const)));
  for (const item of basket) {
    const p = productsById.get(item.usualProductId);
    if (p) checked.set(p.id, p);
  }
  const { recalls } = await fetchRecalls();
  const recallMatches = matchRecalls([...checked.values()], recalls);

  // This week's prices compared with themselves show no drops; the Deal Watch page can simulate next week.
  const deals = detectDeals(DEMO_WAITLIST, products, products);

  return {
    ok: true,
    data: { trip, ranking, swapSavingsCents, stores, pricedStoreIds: [...new Set(products.map((p) => p.storeId))], itemCount: basket.length, unmatched, recall: recallMatches[0] ?? null, recallCount: recallMatches.length, deals },
  };
}
