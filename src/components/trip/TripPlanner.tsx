"use client";

import { CircleAlert, Clock, Fuel, ListChecks, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { CommuteLine } from "@/components/shared/CommuteLine";
import { DataSourceNote } from "@/components/shared/DataSourceNote";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Money } from "@/components/shared/Money";
import { PreferencePicker } from "@/components/shared/PreferencePicker";
import { Button } from "@/components/ui/button";
import { assumptions, COMMUTE } from "@/lib/config/app";
import type { Product, Store } from "@/lib/data/schema";
import { basketFromEntries } from "@/lib/list/list";
import { usePreference } from "@/lib/preferences/usePreference";
import { DEFAULT_USUAL_STORE_ID, optimizeTrip } from "@/lib/trip/optimizer";
import { cn } from "@/lib/utils";
import { PlanComparison } from "./PlanComparison";
import { detourText, StopCard } from "./StopCard";

/**
 * The Trip Plan page's content: the trip preference switch, the commute drawing with the chosen stops, one card per
 * stop, the cost breakdown and a comparison with the cheapest single-store and fastest trips.
 * It re-plans instantly in the browser whenever the preference or the saved list changes, using the real optimizer.
 * Example: switching from "Balance" to "Get home fastest" can drop the ALDI stop and show the new totals at once.
 */
export function TripPlanner({ products, stores }: { products: Product[]; stores: Store[] }) {
  const { value: entries, ready: listReady } = usePreference("list");
  const { value: preference, ready: prefReady, save: savePreference } = usePreference("selectedPreference");
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const { basket, unmatched } = useMemo(() => basketFromEntries(entries, productsById), [entries, productsById]);
  const result = useMemo(
    () => optimizeTrip({ basket, products, stores, preference, usualStoreId: DEFAULT_USUAL_STORE_ID }),
    [basket, products, stores, preference],
  );

  if (!listReady || !prefReady) {
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
        description="Add your weekly items on My List, then come back for the best stops on your drive home."
        action={
          <Button asChild>
            <Link href="/list">Go to My List</Link>
          </Button>
        }
      />
    );
  }

  const plan = result.recommended;
  const tripTotal = plan.checkoutTotalCents + plan.gasCostCents;
  const usualTotal = tripTotal + plan.savingsCents;
  const detourMinutes = plan.stops.reduce((sum, s) => sum + s.store.detourMinutes, 0);
  const stopMinutes = plan.extraMinutes - detourMinutes;
  const miles = plan.stops.reduce((sum, s) => sum + s.store.detourMiles, 0);
  const orderedStores = [...stores].sort((a, b) => a.detourMinutes - b.detourMinutes || a.id.localeCompare(b.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-6">
        <PreferencePicker value={preference} onChange={(v) => savePreference(v)} />
        <p className="text-right" aria-live="polite">
          {plan.savingsCents > 0 ? (
            <>
              <span className="font-display text-2xl font-semibold">
                You save <Money cents={plan.savingsCents} className="text-savings" />
              </span>
              <span className="block text-sm text-muted-foreground">vs. your usual products at your usual store, gas included</span>
            </>
          ) : (
            <>
              <span className="font-display text-2xl font-semibold">No savings this week</span>
              <span className="block text-sm text-muted-foreground">
                This trip costs <Money cents={-plan.savingsCents} /> more than your usual products would. Try another preference.
              </span>
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-12 items-start gap-6">
        <div className="col-span-5 space-y-6">
          <section aria-labelledby="drive-title" className="rounded-2xl border bg-surface p-6">
            <h2 id="drive-title" className="font-display text-xl font-semibold">
              Your drive
            </h2>
            <p className="text-sm text-muted-foreground">
              {plan.stops.length === 1 ? "One stop" : `${plan.stops.length} stops`} between {COMMUTE.from} and {COMMUTE.to}
            </p>
            <div className="mt-3 rounded-xl bg-background px-3 pt-2">
              <CommuteLine stores={stores} stopIds={plan.storeIds} from={COMMUTE.from} to={COMMUTE.to} />
              <p className="pb-2 text-right text-[11px] text-muted-foreground">Diagram, not to scale</p>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {orderedStores.map((store) => {
                const isStop = plan.storeIds.includes(store.id);
                return (
                  <li key={store.id} className={cn("flex justify-between rounded-md px-2 py-1", isStop ? "bg-primary-soft font-medium" : "text-muted-foreground")}>
                    <span>
                      {store.chain}
                      {isStop ? <span className="sr-only"> (stop on this trip)</span> : null}
                    </span>
                    <span className="tabular-nums">{detourText(store)}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="cost-title" className="rounded-2xl border bg-surface p-6">
            <h2 id="cost-title" className="font-display text-xl font-semibold">
              Cost breakdown
            </h2>
            <dl className="mt-3 space-y-2 text-sm [&>div]:flex [&>div]:items-baseline [&>div]:justify-between">
              <div>
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <ShoppingBasket aria-hidden className="size-4" /> Groceries
                </dt>
                <dd>
                  <Money cents={plan.checkoutTotalCents} />
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <Fuel aria-hidden className="size-4" /> Estimated gas ({Number(miles.toFixed(1))} extra mi × ${assumptions.gasCostPerMile.toFixed(2)})
                </dt>
                <dd>
                  <Money cents={plan.gasCostCents} />
                </dd>
              </div>
              <div className="border-t pt-2 font-semibold">
                <dt>Trip total</dt>
                <dd>
                  <Money cents={tripTotal} />
                </dd>
              </div>
              <div className="text-muted-foreground">
                <dt>Usual products at your usual store, with gas</dt>
                <dd>
                  <Money cents={usualTotal} />
                </dd>
              </div>
              <div className="border-t pt-2">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <Clock aria-hidden className="size-4" /> Extra time
                </dt>
                <dd className="font-semibold tabular-nums">+{plan.extraMinutes} min</dd>
              </div>
            </dl>
            <p className="mt-1 text-xs text-muted-foreground">
              {detourMinutes} min of detours{stopMinutes > 0 ? ` + ${stopMinutes} min for parking and checkout at the extra stop${plan.stops.length > 2 ? "s" : ""}` : ""}. Your time is
              counted at ${assumptions.timeValuePerMinute[preference].toFixed(2)}/min when choosing the trip
              {plan.timeCostCents > 0 ? (
                <>
                  {" "}
                  (<Money cents={plan.timeCostCents} />)
                </>
              ) : null}
              , but it isn&apos;t added to what you pay.
            </p>
          </section>
        </div>

        <section aria-labelledby="stops-title" className="col-span-7 space-y-4">
          <h2 id="stops-title" className="sr-only">
            Stops
          </h2>
          {plan.stops.map((stop, i) => (
            <StopCard key={stop.store.id} stop={stop} number={i + 1} productsById={productsById} />
          ))}
          {plan.missing.length > 0 || unmatched.length > 0 ? (
            <div role="note" aria-label="Missing items" className="flex gap-3 rounded-2xl border border-dashed bg-surface p-5">
              <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">Not included in this trip&apos;s total</p>
                {plan.missing.length > 0 ? <p className="text-muted-foreground">No store on your route sells: {plan.missing.map((m) => m.label).join(", ")}.</p> : null}
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

      <PlanComparison result={result} stores={stores} />
      <DataSourceNote />
    </div>
  );
}
