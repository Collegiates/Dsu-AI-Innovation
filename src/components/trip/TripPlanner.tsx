"use client";

import { ArrowRight, CircleAlert, ListChecks, Receipt, ShieldAlert, ShoppingBasket, Store as StoreIcon, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { DataSourceNote } from "@/components/shared/DataSourceNote";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Money } from "@/components/shared/Money";
import { PreferencePicker } from "@/components/shared/PreferencePicker";
import { Button } from "@/components/ui/button";
import { assumptions } from "@/lib/config/app";
import type { Product, Store } from "@/lib/data/schema";
import { basketFromEntries } from "@/lib/list/list";
import { usePreference } from "@/lib/preferences/usePreference";
import { findSwaps, type Swap } from "@/lib/swaps/findSwaps";
import { DEFAULT_USUAL_STORE_ID, optimizeTrip } from "@/lib/trip/optimizer";
import { PlanComparison } from "./PlanComparison";
import { StopCard } from "./StopCard";

const RECEIPT_NOTE_KEY = "reroute:receipt-note";
const noSubscribe = () => () => {};
/** The note left by the Dashboard's receipt upload (where the list came from), or null. */
function readReceiptNote(): string | null {
  try {
    return sessionStorage.getItem(RECEIPT_NOTE_KEY);
  } catch {
    return null;
  }
}

/**
 * The Trip Plan page's content, using only the stores the shopper picked: a "Shop at ALDI: $X" line with the other
 * stores' totals beside it, the preference switch, one card per store (with "Cheaper swap" chips and a "Whole list /
 * Only savings" switch to see just the discounted items), the cost breakdown
 * and a comparison of trips. It re-plans instantly in the browser whenever the stores, preference or list change.
 * Example: with Walmart and ALDI picked, "Shop at ALDI: $41.20 · Walmart only: $52.10".
 */
export function TripPlanner({ products, stores }: { products: Product[]; stores: Store[] }) {
  const { value: entries, ready: listReady } = usePreference("list");
  const { value: preference, ready: prefReady, save: savePreference } = usePreference("selectedPreference");
  const { value: selectedIds, ready: storesReady } = usePreference("selectedStores");
  const { value: hiddenBrands } = usePreference("hiddenBrands");
  const { value: hiddenProducts } = usePreference("hiddenProducts");
  const [onlySavings, setOnlySavings] = useState(false);
  const receiptNote = useSyncExternalStore(noSubscribe, readReceiptNote, () => null);
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const { basket, unmatched } = useMemo(() => basketFromEntries(entries, productsById), [entries, productsById]);
  // Only stores the shopper picked, and only ones with collected prices.
  const chosenStores = useMemo(() => {
    const priced = new Set(products.map((p) => p.storeId));
    return stores.filter((s) => selectedIds.includes(s.id) && priced.has(s.id));
  }, [stores, products, selectedIds]);
  const result = useMemo(
    () => optimizeTrip({ basket, products, stores: chosenStores, preference, usualStoreId: DEFAULT_USUAL_STORE_ID }),
    [basket, products, chosenStores, preference],
  );
  // Each picked store on its own, so the hero can compare "Shop at ALDI" with "Walmart only".
  const singleStore = useMemo(
    () => chosenStores.map((store) => ({ store, plan: optimizeTrip({ basket, products, stores: [store], preference }).recommended })),
    [basket, products, chosenStores, preference],
  );
  // Swaps at the picked stores, keyed by list line, for the "Cheaper swap" chips.
  const swapsByLine = useMemo(() => {
    const chosenIds = new Set(chosenStores.map((s) => s.id));
    const swaps = findSwaps({ basket, products: products.filter((p) => chosenIds.has(p.storeId) || basket.some((b) => b.usualProductId === p.id)), hiddenBrands, hiddenProducts });
    return new Map<number, Swap>(swaps.filter((s) => chosenIds.has(s.to.storeId)).map((s) => [s.basketIndex, s]));
  }, [basket, products, chosenStores, hiddenBrands, hiddenProducts]);

  if (!listReady || !prefReady || !storesReady) {
    return (
      <div aria-busy="true" aria-label="Planning your trip" className="grid grid-cols-12 gap-6">
        <LoadingSkeleton className="col-span-5 h-96" />
        <LoadingSkeleton className="col-span-7 h-96" />
      </div>
    );
  }
  if (basket.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="Nothing to plan yet"
        description="Add your weekly items on My List, then come back to see where to shop."
        action={
          <Button asChild>
            <Link href="/list">Go to My List</Link>
          </Button>
        }
      />
    );
  }
  if (chosenStores.length === 0) {
    return (
      <EmptyState
        icon={StoreIcon}
        title="Pick at least one store"
        description="Choose the stores you shop at, and the plan will compare them."
        action={
          <Button asChild>
            <Link href="/plan">Choose stores</Link>
          </Button>
        }
      />
    );
  }

  const plan = result.recommended;
  const usualTotal = plan.checkoutTotalCents + plan.savingsCents;
  const planNames = plan.stops.map((s) => s.store.chain).join(" + ");
  // Picked stores without collected prices: said plainly, never priced at $0.
  const pricedIds = new Set(products.map((p) => p.storeId));
  const unpricedPicked = stores.filter((s) => selectedIds.includes(s.id) && !pricedIds.has(s.id));
  const others = singleStore.filter((o) => !(plan.storeIds.length === 1 && plan.storeIds[0] === o.store.id));
  const extraStops = Math.max(0, plan.stops.length - 1);

  return (
    <div className="space-y-6">
      <div role="note" aria-label="Recall alert" className="flex items-center gap-3 rounded-xl border border-recall/30 bg-recall-soft px-4 py-2.5 text-sm">
        <ShieldAlert aria-hidden className="size-4 shrink-0 text-recall" />
        <p>
          <span className="font-medium text-recall">Possible recall in your past purchases</span>
          {" → "}
          <Link href="/recalls" className="font-medium underline underline-offset-4">
            check the lot code
          </Link>
          <span className="text-muted-foreground">. No recall matches for this week&apos;s list.</span>
        </p>
      </div>

      {receiptNote ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Receipt aria-hidden className="size-4 text-primary" />
          {receiptNote}
        </p>
      ) : null}

      <section aria-labelledby="hero-title" className="flex items-end justify-between gap-6 rounded-2xl border bg-surface p-6">
        <div>
          {plan.stops.length > 0 ? (
            <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary">
              <Trophy aria-hidden className="size-4" /> Winner this week
            </p>
          ) : null}
          <h2 id="hero-title" className="font-display text-4xl font-semibold tracking-tight">
            {plan.stops.length > 0 ? (
              <>
                Shop at {planNames}: <Money cents={plan.checkoutTotalCents} />
              </>
            ) : (
              "None of your stores sells these items"
            )}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {plan.savingsCents > 0 ? (
              <>
                You save <Money cents={plan.savingsCents} className="font-semibold text-savings" /> vs. your usual products at your usual store.
              </>
            ) : (
              "Your usual products are already the best value at these stores."
            )}
          </p>
          <Button asChild className="mt-4">
            <Link href="/list">
              See your grocery list <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
        {others.length > 0 ? (
          <ul aria-label="Other stores" className="space-y-1 text-right text-sm">
            {others.map(({ store, plan: alone }) => (
              <li key={store.id}>
                <span className="text-muted-foreground">{store.chain} only: </span>
                {alone.stops.length > 0 ? <Money cents={alone.checkoutTotalCents} className="font-semibold" /> : <span>sells none of these</span>}
                {alone.stops.length > 0 && alone.missing.length > 0 ? (
                  <span className="block text-xs text-muted-foreground">
                    {alone.missing.length} item{alone.missing.length > 1 ? "s" : ""} not sold there
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="flex items-center justify-between gap-6">
        <PreferencePicker value={preference} onChange={(v) => savePreference(v)} />
        {unpricedPicked.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            No prices yet for {unpricedPicked.map((s) => s.chain).join(" and ")}, so {unpricedPicked.length > 1 ? "they're" : "it's"} not in this plan.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-12 items-start gap-6">
        <div className="col-span-5 space-y-6">
          <section aria-labelledby="cost-title" className="rounded-2xl border bg-surface p-6">
            <h2 id="cost-title" className="font-display text-xl font-semibold">
              Cost breakdown
            </h2>
            <dl className="mt-3 space-y-2 text-sm [&>div]:flex [&>div]:items-baseline [&>div]:justify-between">
              {plan.stops.map((stop) => (
                <div key={stop.store.id}>
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <ShoppingBasket aria-hidden className="size-4" /> {stop.store.chain}
                  </dt>
                  <dd>
                    <Money cents={stop.subtotalCents} />
                  </dd>
                </div>
              ))}
              <div className="border-t pt-2 font-semibold">
                <dt>Groceries total</dt>
                <dd>
                  <Money cents={plan.checkoutTotalCents} />
                </dd>
              </div>
              <div className="text-muted-foreground">
                <dt>Usual products at your usual store</dt>
                <dd>
                  <Money cents={usualTotal} />
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              {extraStops > 0
                ? `A second store only wins if it saves more than its extra stop is worth to you (${assumptions.minutesPerExtraStop} min at $${assumptions.timeValuePerMinute[preference].toFixed(2)}/min).`
                : `One store: another store would need to save more than ${assumptions.minutesPerExtraStop} min of your time is worth ($${assumptions.timeValuePerMinute[preference].toFixed(2)}/min) to be added.`}
            </p>
          </section>
        </div>

        <section aria-labelledby="stops-title" className="col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="stops-title" className="font-display text-xl font-semibold">
              {onlySavings ? "Where you save" : "What to buy"}
            </h2>
            <div role="group" aria-label="Show items" className="inline-flex rounded-lg border bg-surface p-0.5 text-sm">
              {[
                { value: false, label: "Whole list" },
                { value: true, label: "Only savings" },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  aria-pressed={onlySavings === o.value}
                  onClick={() => setOnlySavings(o.value)}
                  className={onlySavings === o.value ? "rounded-md bg-primary px-3 py-1 font-medium text-primary-foreground" : "rounded-md px-3 py-1 text-muted-foreground hover:text-foreground"}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {plan.stops.map((stop, i) => (
            <StopCard key={stop.store.id} stop={stop} number={i + 1} productsById={productsById} swapsByLine={swapsByLine} onlySavings={onlySavings} />
          ))}
          {plan.missing.length > 0 || unmatched.length > 0 ? (
            <div role="note" aria-label="Missing items" className="flex gap-3 rounded-2xl border border-dashed bg-surface p-5">
              <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">Not included in this trip&apos;s total</p>
                {plan.missing.length > 0 ? <p className="text-muted-foreground">None of your stores sells: {plan.missing.map((m) => m.label).join(", ")}.</p> : null}
                {unmatched.length > 0 ? (
                  <p className="text-muted-foreground">
                    Not matched on My List: {unmatched.map((t) => `“${t}”`).join(", ")}.{" "}
                    <Link href="/list" className="font-medium text-primary underline-offset-4 hover:underline">
                      Edit list
                    </Link>
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <PlanComparison result={result} stores={chosenStores} />
      <DataSourceNote />
    </div>
  );
}
