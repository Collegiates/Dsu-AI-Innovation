import { Money } from "@/components/shared/Money";
import type { StoreRanking } from "@/lib/trip/rankStores";

/**
 * This week's trip in brief: the one store to go to, how many items to buy there, and the bill.
 * Example: "One trip · ALDI, 12 items, $57.34".
 */
export function TripCard({ ranking }: { ranking: StoreRanking }) {
  const winner = ranking.winner;
  const stop = winner?.plan.stops[0];
  return (
    <section aria-labelledby="trip-title" className="flex flex-1 flex-col rounded-2xl border bg-surface p-6">
      <h2 id="trip-title" className="font-display text-xl font-semibold">
        This week&apos;s trip
      </h2>
      <p className="text-sm text-muted-foreground">{stop ? "One trip, one store" : "Nothing to buy yet"}</p>
      {stop ? (
        <div className="mt-5 flex items-center justify-between rounded-lg border px-3 py-2.5">
          <span>
            <span className="font-medium">{stop.store.chain}</span>
            <span className="text-sm text-muted-foreground"> · {stop.items.length} items</span>
          </span>
          <Money cents={stop.subtotalCents} className="font-medium" />
        </div>
      ) : null}
    </section>
  );
}
