import "server-only";
import { connection } from "next/server";
import type { TripPreference } from "@/lib/config/app";
import { DEMO_WAITLIST, DEMO_WEEKLY_LIST } from "@/lib/config/demo";
import { loadCatalog } from "@/lib/data/load";
import type { Store } from "@/lib/data/schema";
import { detectDeals, type Deal } from "@/lib/deals/detectDeals";
import { matchRecalls, type RecallMatch } from "@/lib/recalls/match";
import { fetchRecalls } from "@/lib/recalls/openfda";
import { basketFromList } from "@/lib/trip/demoBasket";
import { DEFAULT_USUAL_STORE_ID, optimizeTrip, type TripResult } from "@/lib/trip/optimizer";

/** Everything the Dashboard shows, all computed by code from the real data files. */
export type DashboardData = {
  trip: TripResult;
  stores: Store[];
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
  let catalog;
  try {
    catalog = loadCatalog();
  } catch (error) {
    console.error("[dashboard] catalog unavailable", error);
    return { ok: false, message: "The store and price data hasn't been imported yet. Measure each store's detour, then run npm run import-data." };
  }
  const { products, stores, productsById } = catalog;
  const { basket, unmatched } = basketFromList(DEMO_WEEKLY_LIST, products, DEFAULT_USUAL_STORE_ID);
  const trip = optimizeTrip({ basket, products, stores, preference, usualStoreId: DEFAULT_USUAL_STORE_ID });

  // Check what the shopper will actually buy, plus their usual products.
  const checked = new Map(trip.recommended.stops.flatMap((s) => s.items.map((i) => [i.product.id, i.product] as const)));
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
    data: { trip, stores, itemCount: basket.length, unmatched, recall: recallMatches[0] ?? null, recallCount: recallMatches.length, deals },
  };
}
