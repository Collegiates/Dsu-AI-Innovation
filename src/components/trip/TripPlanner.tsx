"use client";

import { ArrowRight, CircleAlert, ListChecks, Receipt, ShieldAlert, Store as StoreIcon, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { DataSourceNote } from "@/components/shared/DataSourceNote";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Money } from "@/components/shared/Money";
import { SavingsThreshold } from "@/components/shared/SavingsThreshold";
import { Button } from "@/components/ui/button";
import type { Product, Store } from "@/lib/data/schema";
import { basketFromEntries } from "@/lib/list/list";
import { weeklyToMonthlyCents } from "@/lib/pricing/monthly";
import { usePreference } from "@/lib/preferences/usePreference";
import { findSwaps, type Swap } from "@/lib/swaps/findSwaps";
import { rankStores } from "@/lib/trip/rankStores";
import { SavingsOverview } from "./SavingsOverview";
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
 * The Trip Plan page: one trip a week, to one store. Every store the shopper picked is priced on the whole list, the
 * best one is named the winner ("Shop at ALDI: $57.34"), the other stores' totals are shown beside it, and the full
 * grocery list for the winner follows, with "Cheaper swap" chips and an "Overview" popup of the discounted items.
 * Example: with Walmart and ALDI picked, ALDI wins because it sells all 12 items for $57.34.
 */
export function TripPlanner({ products, stores }: { products: Product[]; stores: Store[] }) {
  const { value: entries, ready: listReady } = usePreference("list");
  const { value: selectedIds, ready: storesReady } = usePreference("selectedStores");
  const { value: hiddenBrands } = usePreference("hiddenBrands");
  const { value: hiddenProducts } = usePreference("hiddenProducts");
  const { value: minSavingsCents } = usePreference("minSavingsCents");
  const receiptNote = useSyncExternalStore(noSubscribe, readReceiptNote, () => null);
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const { basket, unmatched } = useMemo(() => basketFromEntries(entries, productsById), [entries, productsById]);
  // Only stores the shopper picked, and only ones with collected prices.
  const chosenStores = useMemo(() => {
    const priced = new Set(products.map((p) => p.storeId));
    return stores.filter((s) => selectedIds.includes(s.id) && priced.has(s.id));
  }, [stores, products, selectedIds]);
  const ranking = useMemo(() => rankStores(basket, products, chosenStores), [basket, products, chosenStores]);
  // Swaps at the winning store, keyed by list line, for the "Cheaper swap" chips.
  const swapsByLine = useMemo(() => {
    const winnerId = ranking.winner?.store.id;
    const swaps = findSwaps({ basket, products, hiddenBrands, hiddenProducts });
    return new Map<number, Swap>(swaps.filter((s) => s.to.storeId === winnerId && s.savingsCents >= minSavingsCents).map((s) => [s.basketIndex, s]));
  }, [basket, products, ranking, hiddenBrands, hiddenProducts, minSavingsCents]);

  if (!listReady || !storesReady) {
    return (
      <div aria-busy="true" aria-label="Finding your best store" className="grid grid-cols-12 gap-6">
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
        description="Upload a receipt or add your weekly items on My List, then come back to see your best store."
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
        description="Choose the stores you shop at, and we'll find the best one for your list."
        action={
          <Button asChild>
            <Link href="/plan">Choose stores</Link>
          </Button>
        }
      />
    );
  }

  const { winner, quotes, savings } = ranking;
  // What the recommended swaps at the winning store save, at or above the shopper's threshold.
  const swapWeeklyCents = [...swapsByLine.values()].reduce((sum, s) => sum + s.savingsCents, 0);
  const stop = winner?.plan.stops[0];
  const pricedIds = new Set(products.map((p) => p.storeId));
  const unpricedPicked = stores.filter((s) => selectedIds.includes(s.id) && !pricedIds.has(s.id));

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
          {winner ? (
            <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary">
              <Trophy aria-hidden className="size-4" /> Best store this week
            </p>
          ) : null}
          <h2 id="hero-title" className="font-display text-4xl font-semibold tracking-tight">
            {winner ? (
              <>
                Shop at {winner.store.chain}: <Money cents={winner.totalCents} />
              </>
            ) : (
              "None of your stores sells these items"
            )}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {winner && savings && savings.sharedItems > 0 && savings.savingsCents > 0 ? (
              <>
                You save <Money cents={savings.savingsCents} className="font-semibold text-savings" /> vs. {savings.versus.chain} on the {savings.sharedItems}{" "}
                item{savings.sharedItems === 1 ? "" : "s"} both stores sell
                {winner.missing === 0 ? ", and it has your whole list" : ""}.
              </>
            ) : winner ? (
              `One trip, one store${winner.missing === 0 ? ": everything on your list is here" : ""}.`
            ) : null}
          </p>
          {swapWeeklyCents > 0 ? (
            <p className="mt-2 font-display text-2xl font-semibold">
              Swaps save you <Money cents={swapWeeklyCents} className="text-savings" /> a week ·{" "}
              <Money cents={weeklyToMonthlyCents(swapWeeklyCents)} className="text-savings" /> a month
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No swaps at or above your savings threshold.</p>
          )}
          <div className="mt-3">
            <SavingsThreshold id="trip-threshold" />
          </div>
          <Button asChild className="mt-4">
            <Link href="/list">
              See your grocery list <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
        <div aria-label="Store comparison" className="w-80 space-y-3 text-sm">
          {quotes
            .filter((q) => q !== winner && q.winnerCentsForSameItems !== null)
            .map((q) => {
              const winnerSame = q.winnerCentsForSameItems ?? 0;
              const diff = q.totalCents - winnerSame;
              const rest = (winner?.totalCents ?? 0) - winnerSame;
              const restItems = (winner?.items ?? 0) - q.items;
              return (
                <div key={q.store.id} className="rounded-xl border p-4">
                  <p className="font-medium">Same {q.items} items at both stores</p>
                  <dl className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <dt>{winner?.store.chain}</dt>
                      <dd className="font-semibold">
                        <Money cents={winnerSame} />
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>{q.store.chain}</dt>
                      <dd className="font-semibold">
                        <Money cents={q.totalCents} />
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {diff > 0 ? (
                      <>
                        {winner?.store.chain} is <Money cents={diff} /> cheaper on these.
                      </>
                    ) : diff < 0 ? (
                      <>
                        {q.store.chain} is <Money cents={-diff} /> cheaper on these
                      </>
                    ) : (
                      "Same price on these"
                    )}
                    {restItems > 0 ? (
                      <>
                        {diff < 0 ? ", but " : " "}
                        {q.store.chain} doesn&apos;t carry the other {restItems} items (<Money cents={rest} /> at {winner?.store.chain}), so {winner?.store.chain} is the one trip that
                        gets everything.
                      </>
                    ) : null}
                  </p>
                </div>
              );
            })}
          {unpricedPicked.length > 0 ? <p className="text-xs text-muted-foreground">No prices yet for {unpricedPicked.map((s) => s.chain).join(", ")}.</p> : null}
        </div>
      </section>

      {stop ? (
        <section aria-labelledby="stops-title" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="stops-title" className="font-display text-xl font-semibold">
              Your grocery list at {stop.store.chain}
            </h2>
            <SavingsOverview plan={winner!.plan} basket={basket} productsById={productsById} minSavingsCents={minSavingsCents} />
          </div>
          <StopCard
            stop={stop}
            number={1}
            productsById={productsById}
            swapsByLine={swapsByLine}
            basket={basket}
            storeNames={new Map(stores.map((st) => [st.id, st.chain]))}
          />
          {winner!.plan.missing.length > 0 || unmatched.length > 0 ? (
            <div role="note" aria-label="Missing items" className="flex gap-3 rounded-2xl border border-dashed bg-surface p-5">
              <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">Not included in this total</p>
                {winner!.plan.missing.length > 0 ? (
                  <p className="text-muted-foreground">
                    {stop.store.chain} doesn&apos;t sell: {winner!.plan.missing.map((m) => m.label).join(", ")}.
                  </p>
                ) : null}
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
      ) : null}

      <DataSourceNote />
    </div>
  );
}
