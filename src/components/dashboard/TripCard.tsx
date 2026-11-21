import { Money } from "@/components/shared/Money";
import type { TripResult } from "@/lib/trip/optimizer";

/**
 * The recommended trip in brief: the chosen store(s), what to buy at each, and each store's bill.
 * Example: "One stop · ALDI, 12 items, $41.20".
 */
export function TripCard({ trip }: { trip: TripResult }) {
  const plan = trip.recommended;
  return (
    <section aria-labelledby="trip-title" className="flex flex-1 flex-col rounded-2xl border bg-surface p-6">
      <h2 id="trip-title" className="font-display text-xl font-semibold">Recommended trip</h2>
      <p className="text-sm text-muted-foreground">
        {plan.stops.length === 0 ? "Nothing to buy yet" : plan.stops.length === 1 ? "One store" : `${plan.stops.length} stores`}
      </p>


      <ol className="mt-5 space-y-2">
        {plan.stops.map((stop, i) => (
          <li key={stop.store.id} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <span className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
              <span>
                <span className="font-medium">{stop.store.chain}</span>
                <span className="text-sm text-muted-foreground"> · {stop.items.length} items</span>
              </span>
            </span>
            <Money cents={stop.subtotalCents} className="font-medium" />
          </li>
        ))}
      </ol>

    </section>
  );
}
