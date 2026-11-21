"use client";

import { CircleAlert, ListChecks, ShieldAlert, ShoppingBasket, Store as StoreIcon } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, ViewTransition } from "react";
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

/**
 * The Trip Plan page's content, using only the stores the shopper picked: a "Shop at ALDI: $X" line with the other
 * stores' totals beside it, the preference switch, one card per store (with "Cheaper swap" chips), the cost breakdown
 * and a comparison of trips. It re-plans instantly in the browser whenever the stores, preference or list change.
 * Example: with Walmart and ALDI picked, "Shop at ALDI: $41.20 · Walmart only: $52.10".
 * Switching the preference is animated so the shopper can see which stores were added, dropped or moved.
 */
export function TripPlanner({ products, stores }: { products: Product[]; stores: Store[] }) {
  const { value: entries, ready: listReady } = usePreference("list");
  const { value: preference, ready: prefReady, save: savePreference } = usePreference("selectedPreference");
  // The whole page (switch included) follows one deferred update, a React transition, so the browser animates the
  // switch, the store cards and the figures together in a single view transition instead of two staggered commits.
  const plannedPreference = useDeferredValue(preference);
  const { value: selectedIds, ready: storesReady } = usePreference("selectedStores");
  const { value: hiddenBrands } = usePreference("hiddenBrands");
  const { value: hiddenProducts } = usePreference("hiddenProducts");
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const { basket, unmatched } = useMemo(() => basketFromEntries(entries, productsById), [entries, productsById]);
  // Only stores the shopper picked, and only ones with collected prices.
  const chosenStores = useMemo(() => {
    const priced = new Set(products.map((p) => p.storeId));
    return stores.filter((s) => selectedIds.includes(s.id) && priced.has(s.id));
  }, [stores, products, selectedIds]);
  const result = useMemo(
    () => optimizeTrip({ basket, products, stores: chosenStores, preference: plannedPreference, usualStoreId: DEFAULT_USUAL_STORE_ID }),
    [basket, products, chosenStores, plannedPreference],
  );
  // Each picked store on its own, so the hero can compare "Shop at ALDI" with "Walmart only".
  const singleStore = useMemo(
    () => chosenStores.map((store) => ({ store, plan: optimizeTrip({ basket, products, stores: [store], preference: plannedPreference }).recommended })),
    [basket, products, chosenStores, plannedPreference],
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

      <section aria-labelledby="hero-title" className="flex items-end justify-between gap-6 rounded-2xl border bg-surface p-6">
        <div>
          <h2 id="hero-title" className="font-display text-4xl font-semibold tracking-tight">
            {plan.stops.length > 0 ? (
              <>
                Shop at {planNames}:{" "}
                <ViewTransition key={plan.checkoutTotalCents} name="trip-total-figure" share="figure-roll" default="none">
                  <Money cents={plan.checkoutTotalCents} className="inline-block" />
                </ViewTransition>
              </>
            ) : (
              "None of your stores sells these items"
            )}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {plan.savingsCents > 0 ? (
              <>
                You save{" "}
                <ViewTransition key={plan.savingsCents} name="savings-figure" share="figure-roll" default="none">
                  <Money cents={plan.savingsCents} className="inline-block font-semibold text-savings" />
                </ViewTransition>{" "}
                vs. your usual products at your usual store.
              </>
            ) : (
              "Your usual products are already the best value at these stores."
            )}
          </p>
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

      <div className="w-fit [view-transition-class:live-layer] [view-transition-name:trip-preference]">
        <PreferencePicker value={plannedPreference} onChange={(v) => savePreference(v)} />
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
                ? `A second store only wins if it saves more than its extra stop is worth to you (${assumptions.minutesPerExtraStop} min at $${assumptions.timeValuePerMinute[plannedPreference].toFixed(2)}/min).`
                : `One store: another store would need to save more than ${assumptions.minutesPerExtraStop} min of your time is worth ($${assumptions.timeValuePerMinute[plannedPreference].toFixed(2)}/min) to be added.`}
            </p>
          </section>
        </div>

        <section aria-labelledby="stops-title" className="col-span-7 space-y-4">
          <h2 id="stops-title" className="sr-only">
            Stops
          </h2>
          {plan.stops.map((stop, i) => (
            <ViewTransition key={stop.store.id} name={`stop-${stop.store.id}`} update="stop-move" enter="stop-enter" exit="stop-exit" default="none">
              <StopCard stop={stop} number={i + 1} productsById={productsById} swapsByLine={swapsByLine} />
            </ViewTransition>
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
