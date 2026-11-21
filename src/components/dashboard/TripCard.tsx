import { Clock, Fuel } from "lucide-react";
import { Money } from "@/components/shared/Money";
import { COMMUTE } from "@/lib/config/app";
import type { Store } from "@/lib/data/schema";
import type { TripResult } from "@/lib/trip/optimizer";
import { CommuteLine } from "./CommuteLine";

/**
 * The recommended trip in brief: a drawing of the commute with the chosen stop(s), each stop's bill,
 * and how much extra time and gas the trip adds compared with driving straight home.
 * Example: "1 stop · +0 min · Walmart, 12 items, $41.20".
 */
export function TripCard({ trip, stores }: { trip: TripResult; stores: Store[] }) {
  const plan = trip.recommended;
  return (
    <section aria-labelledby="trip-title" className="flex h-full flex-col rounded-2xl border bg-surface p-7">
      <h2 id="trip-title" className="font-display text-xl font-semibold">Recommended trip</h2>
      <p className="text-sm text-muted-foreground">
        {plan.stops.length === 0 ? "Nothing to buy yet" : plan.stops.length === 1 ? "One stop on the way home" : `${plan.stops.length} stops on the way home`}
      </p>

      <div className="mt-4 rounded-xl bg-background px-3 pt-2">
        <CommuteLine stores={stores} stopIds={plan.storeIds} from={COMMUTE.from} to={COMMUTE.to} />
        <p className="pb-2 text-right text-[11px] text-muted-foreground">Diagram, not to scale</p>
      </div>

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

      <dl className="mt-auto grid grid-cols-2 gap-3 pt-5 text-sm">
        <div className="flex items-center gap-2">
          <Clock aria-hidden className="size-4 text-muted-foreground" />
          <dt className="text-muted-foreground">Extra time</dt>
          <dd className="ml-auto font-semibold tabular-nums">+{plan.extraMinutes} min</dd>
        </div>
        <div className="flex items-center gap-2">
          <Fuel aria-hidden className="size-4 text-muted-foreground" />
          <dt className="text-muted-foreground">Extra gas</dt>
          <dd className="ml-auto font-semibold"><Money cents={plan.gasCostCents} /></dd>
        </div>
      </dl>
    </section>
  );
}
