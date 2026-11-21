import { ArrowLeftRight, Info } from "lucide-react";
import { Money } from "@/components/shared/Money";
import type { Product } from "@/lib/data/schema";
import { formatSize } from "@/lib/pricing/money";
import type { PlanStop } from "@/lib/trip/optimizer";

/** "On your route" for a store with no detour, otherwise "+4 min · 1.2 mi". */
export function detourText(store: { detourMinutes: number; detourMiles: number }): string {
  return store.detourMinutes === 0 && store.detourMiles === 0 ? "On your route" : `+${store.detourMinutes} min · ${store.detourMiles} mi`;
}

/**
 * One stop on the trip: the store, how far off the route it is, every item to buy there, and the bill.
 * Items that replace the usual product with a cheaper equivalent (same type and variant) say so.
 * Example: "1 · ALDI · +4 min · 1.2 mi — Peanut Delight Creamy Peanut Butter $1.65 … Subtotal $18.40".
 */
export function StopCard({ stop, number, productsById }: { stop: PlanStop; number: number; productsById: ReadonlyMap<string, Product> }) {
  return (
    <article aria-label={`Stop ${number}: ${stop.store.chain}`} className="rounded-2xl border bg-surface">
      <header className="flex items-center justify-between gap-4 border-b px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="grid size-7 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{number}</span>
          <div>
            <h3 className="font-semibold leading-tight">{stop.store.chain}</h3>
            <p className="text-xs text-muted-foreground">
              {stop.store.name} · {detourText(stop.store)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{stop.items.length} items</p>
          <Money cents={stop.subtotalCents} className="text-lg font-semibold" />
        </div>
      </header>
      <ul className="divide-y px-5">
        {stop.items.map((item) => {
          const usual = productsById.get(item.usualProductId);
          return (
            <li key={`${item.basketIndex}-${item.product.id}`} className="flex items-start justify-between gap-4 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {item.product.brand} {item.product.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.packages > 1 ? `${item.packages} × ` : ""}
                  {formatSize(item.product.sizeValue, item.product.sizeUnit)}
                  {item.isSubstitute && usual ? (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-primary" title={`Your usual: ${usual.brand} ${usual.name}`}>
                      <ArrowLeftRight aria-hidden className="size-3" />
                      Cheaper equivalent of your usual {usual.brand}
                    </span>
                  ) : null}
                  {item.note ? (
                    <span className="ml-1.5 inline-flex items-center gap-1">
                      <Info aria-hidden className="size-3" />
                      Formulas differ, so compare loads on the label
                    </span>
                  ) : null}
                </p>
              </div>
              <Money cents={item.checkoutCents} className="shrink-0 text-sm" />
            </li>
          );
        })}
      </ul>
    </article>
  );
}
