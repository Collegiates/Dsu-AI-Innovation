import { assumptions, type TripPreference } from "@/lib/config/app";
import type { Product, Store } from "@/lib/data/schema";
import { toCents } from "@/lib/pricing/money";
import { checkoutCost } from "@/lib/pricing/price";
import { comparisonPrice, isCompatible, neededAmount, type BasketItem } from "./basket";

/** The store the shopper normally goes to, used as the "before" picture when measuring savings. */
export const DEFAULT_USUAL_STORE_ID = "walmart-dover";

/** The most stores the planner will combine. 5 stores means at most 31 combinations to check. */
export const MAX_STORES = 5;

/** One product the plan buys, at one store, for one line of the list. */
export type PlanItem = {
  basketIndex: number;
  usualProductId: string;
  product: Product;
  packages: number;
  checkoutCents: number;
  /** True when the plan buys a different (but compatible) product than the usual one. */
  isSubstitute: boolean;
  /** Set when the price comparison is rough, e.g. "formulas differ" for detergents without a load count. */
  note?: "formulas differ";
};

/** One stop on the trip: the store, what to buy there, and what it costs at the register. */
export type PlanStop = { store: Store; items: PlanItem[]; subtotalCents: number };

/** A list line that no store in the plan carries. It is listed, never priced at $0. */
export type MissingItem = { basketIndex: number; usualProductId: string; label: string };

/** A full shopping trip: where to stop, what to buy, and what it costs in money and time. */
export type TripPlan = {
  storeIds: string[];
  stops: PlanStop[];
  checkoutTotalCents: number;
  gasCostCents: number;
  extraMinutes: number;
  /** The shopper's time turned into dollars using their preference (zero for "maxSavings"). */
  timeCostCents: number;
  /** What the planner minimizes: groceries + gas + time cost. */
  scoreCents: number;
  missing: MissingItem[];
  /** Baseline (usual products at the usual store) minus this plan, groceries plus gas, for the items this plan buys. */
  savingsCents: number;
  /** The same comparison on groceries only, ignoring gas. */
  grocerySavingsCents: number;
};

/** The "before" picture: the usual products at the usual store. */
export type Baseline = {
  storeId: string;
  checkoutTotalCents: number;
  gasCostCents: number;
  extraMinutes: number;
  missing: MissingItem[];
};

/** The recommended plan plus two plans to compare it against. */
export type TripResult = {
  preference: TripPreference;
  recommended: TripPlan;
  cheapestSingleStore: TripPlan | null;
  fastest: TripPlan | null;
  baseline: Baseline;
};

export type OptimizeInput = {
  basket: readonly BasketItem[];
  products: readonly Product[];
  stores: readonly Store[];
  preference: TripPreference;
  usualStoreId?: string;
};

/** Every non-empty group of stores, smallest groups first. Example: [A, B] → [A], [B], [A, B]. */
function storeCombinations(stores: readonly Store[]): Store[][] {
  const combos: Store[][] = [];
  for (let mask = 1; mask < 1 << stores.length; mask++) {
    combos.push(stores.filter((_, i) => mask & (1 << i)));
  }
  return combos.sort((a, b) => a.length - b.length);
}

type Choice = Omit<PlanItem, "basketIndex" | "usualProductId">;

/** The cheapest compatible product for one list line among the given stores, or null if none carries it. */
function cheapestChoice(item: BasketItem, usual: Product, candidates: readonly Product[], storeIds: Set<string>): Choice | null {
  const needed = neededAmount(item, usual);
  let best: Choice | null = null;
  for (const product of candidates) {
    if (!storeIds.has(product.storeId) || !isCompatible(usual, product)) continue;
    const cost = checkoutCost(needed, product);
    if (cost === null) continue;
    const choice: Choice = {
      product,
      packages: cost.packages,
      checkoutCents: cost.cents,
      isSubstitute: product.id !== usual.id,
      note: product.id !== usual.id ? comparisonPrice(product)?.note : undefined,
    };
    if (best === null || compareChoices(choice, best) < 0) best = choice;
  }
  return best;
}

// Ties go to the lower price, then the usual product (no needless switch), then the product id, so results never vary.
function compareChoices(a: Choice, b: Choice): number {
  return (
    a.checkoutCents - b.checkoutCents ||
    Number(a.isSubstitute) - Number(b.isSubstitute) ||
    a.product.id.localeCompare(b.product.id)
  );
}

type Line = { index: number; item: BasketItem; usual: Product | undefined };

const missingFor = (line: Line): MissingItem => ({
  basketIndex: line.index,
  usualProductId: line.item.usualProductId,
  label: line.usual ? `${line.usual.brand} ${line.usual.name}` : line.item.usualProductId,
});

/** Prices one group of stores. Returns null if a store in the group would get nothing to buy (a smaller group does better). */
function planFor(
  combo: readonly Store[],
  lines: readonly Line[],
  products: readonly Product[],
  preference: TripPreference,
  baselineByIndex: Map<number, number>,
  baselineGasCents: number,
): TripPlan | null {
  const storeIds = new Set(combo.map((s) => s.id));
  const byStore = new Map<string, PlanItem[]>(combo.map((s) => [s.id, []]));
  const missing: MissingItem[] = [];

  for (const line of lines) {
    const choice = line.usual ? cheapestChoice(line.item, line.usual, products, storeIds) : null;
    if (!choice) {
      missing.push(missingFor(line));
      continue;
    }
    byStore.get(choice.product.storeId)!.push({ basketIndex: line.index, usualProductId: line.item.usualProductId, ...choice });
  }
  if (combo.some((s) => byStore.get(s.id)!.length === 0)) return null;

  // Stops are listed nearest-first (smallest detour), with the store id breaking ties.
  const stops = [...combo]
    .sort((a, b) => a.detourMinutes - b.detourMinutes || a.id.localeCompare(b.id))
    .map((store) => {
      const items = byStore.get(store.id)!;
      return { store, items, subtotalCents: items.reduce((sum, i) => sum + i.checkoutCents, 0) };
    });

  return priceTrip(stops, missing, preference, baselineByIndex, baselineGasCents);
}

/** Adds up groceries, gas, time and savings for a set of stops. */
function priceTrip(
  stops: PlanStop[],
  missing: MissingItem[],
  preference: TripPreference,
  baselineByIndex: Map<number, number>,
  baselineGasCents: number,
): TripPlan {
  const checkoutTotalCents = stops.reduce((sum, s) => sum + s.subtotalCents, 0);
  // Each detour was measured on its own against driving straight home, so they are added together.
  const miles = stops.reduce((sum, s) => sum + s.store.detourMiles, 0);
  const gasCostCents = toCents(miles * assumptions.gasCostPerMile);
  const extraMinutes =
    stops.reduce((sum, s) => sum + s.store.detourMinutes, 0) + assumptions.minutesPerExtraStop * Math.max(0, stops.length - 1);
  const timeCostCents = toCents(extraMinutes * assumptions.timeValuePerMinute[preference]);

  // Savings compare only the lines this plan actually buys, so a missing item never looks like a saving.
  const bought = stops.flatMap((s) => s.items);
  const baselineForBought = bought.reduce((sum, i) => sum + (baselineByIndex.get(i.basketIndex) ?? i.checkoutCents), 0);
  const gasForBaseline = stops.length > 0 ? baselineGasCents : 0;

  return {
    storeIds: stops.map((s) => s.store.id),
    stops,
    checkoutTotalCents,
    gasCostCents,
    extraMinutes,
    timeCostCents,
    scoreCents: checkoutTotalCents + gasCostCents + timeCostCents,
    missing,
    grocerySavingsCents: baselineForBought - checkoutTotalCents,
    savingsCents: baselineForBought + gasForBaseline - (checkoutTotalCents + gasCostCents),
  };
}

const comboKey = (p: TripPlan) => [...p.storeIds].sort().join("+");

// Complete plans first, then the lowest score, then fewer stops, less time, a lower bill, and finally store ids.
function compareRecommended(a: TripPlan, b: TripPlan): number {
  return (
    a.missing.length - b.missing.length ||
    a.scoreCents - b.scoreCents ||
    a.stops.length - b.stops.length ||
    a.extraMinutes - b.extraMinutes ||
    a.checkoutTotalCents - b.checkoutTotalCents ||
    comboKey(a).localeCompare(comboKey(b))
  );
}

// "Cheapest" means the least money spent: groceries plus gas.
function compareCheapest(a: TripPlan, b: TripPlan): number {
  return (
    a.missing.length - b.missing.length ||
    a.checkoutTotalCents + a.gasCostCents - (b.checkoutTotalCents + b.gasCostCents) ||
    a.extraMinutes - b.extraMinutes ||
    comboKey(a).localeCompare(comboKey(b))
  );
}

function compareFastest(a: TripPlan, b: TripPlan): number {
  return (
    a.missing.length - b.missing.length ||
    a.extraMinutes - b.extraMinutes ||
    a.checkoutTotalCents + a.gasCostCents - (b.checkoutTotalCents + b.gasCostCents) ||
    comboKey(a).localeCompare(comboKey(b))
  );
}

/**
 * Plans the weekly grocery trip: which store(s) to stop at and what to buy at each.
 * It tries every group of 1 to 5 stores, buys each item where it is cheapest within that group, and scores each trip
 * as groceries + gas + the shopper's time (valued by their preference). Trips that get everything on the list win first.
 * Example: if Aldi saves $0.40 but adds a 10-minute stop, "balanced" keeps one stop; "maxSavings" may add Aldi.
 */
export function optimizeTrip(input: OptimizeInput): TripResult {
  const { basket, products, preference } = input;
  const usualStoreId = input.usualStoreId ?? DEFAULT_USUAL_STORE_ID;
  if (input.stores.length > MAX_STORES) {
    throw new Error(`The trip planner handles at most ${MAX_STORES} stores; got ${input.stores.length}.`);
  }
  // Sorting by id first means the same stores in a different order give exactly the same answer.
  const stores = [...input.stores].sort((a, b) => a.id.localeCompare(b.id));
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: Line[] = basket.map((item, index) => ({ index, item, usual: byId.get(item.usualProductId) }));

  // Baseline: each usual product bought as-is, plus the drive to the usual store.
  const usualStore = stores.find((s) => s.id === usualStoreId);
  const baselineByIndex = new Map<number, number>();
  const baselineMissing: MissingItem[] = [];
  for (const line of lines) {
    const cost = line.usual ? checkoutCost(neededAmount(line.item, line.usual), line.usual) : null;
    if (cost) baselineByIndex.set(line.index, cost.cents);
    else baselineMissing.push(missingFor(line));
  }
  const baseline: Baseline = {
    storeId: usualStoreId,
    checkoutTotalCents: [...baselineByIndex.values()].reduce((a, b) => a + b, 0),
    gasCostCents: usualStore ? toCents(usualStore.detourMiles * assumptions.gasCostPerMile) : 0,
    extraMinutes: usualStore?.detourMinutes ?? 0,
    missing: baselineMissing,
  };

  const plans = storeCombinations(stores)
    .map((combo) => planFor(combo, lines, products, preference, baselineByIndex, baseline.gasCostCents))
    .filter((p): p is TripPlan => p !== null);
  // The "no stops" plan only wins when nothing on the list can be bought anywhere (including an empty list).
  const noStops = priceTrip([], lines.map(missingFor), preference, baselineByIndex, baseline.gasCostCents);

  const pick = (candidates: TripPlan[], compare: (a: TripPlan, b: TripPlan) => number) =>
    candidates.length > 0 ? [...candidates].sort(compare)[0] : null;

  return {
    preference,
    recommended: pick(plans, compareRecommended) ?? noStops,
    cheapestSingleStore: pick(plans.filter((p) => p.stops.length === 1), compareCheapest),
    fastest: pick(plans, compareFastest),
    baseline,
  };
}
