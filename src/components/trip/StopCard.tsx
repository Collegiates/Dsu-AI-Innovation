import { Info } from "lucide-react";
import { Money } from "@/components/shared/Money";
import type { Product } from "@/lib/data/schema";
import { formatSize } from "@/lib/pricing/money";
import { checkoutCost } from "@/lib/pricing/price";
import type { Swap } from "@/lib/swaps/findSwaps";
import { neededAmount, type BasketItem } from "@/lib/trip/basket";
import type { PlanStop } from "@/lib/trip/optimizer";
import { AlternativeButton } from "./AlternativeButton";

/**
 * One store on the trip: its name and address, every item to buy there, and the bill.
 * Items that replace the usual product get an "Alternative" button that opens a side-by-side comparison with the
 * usual product (the saving, or the extra cost, computed by code), linking on to Smart Swaps.
 * Example: "1 · ALDI · 10 N Dupont Hwy — Peanut Delight Creamy Peanut Butter $1.65 … Subtotal $18.40".
 */
export function StopCard({
  stop,
  number,
  productsById,
  swapsByLine = new Map(),
  onlySavings = false,
  basket = [],
  storeNames = new Map(),
}: {
  stop: PlanStop;
  number: number;
  productsById: ReadonlyMap<string, Product>;
  swapsByLine?: ReadonlyMap<number, Swap>;
  /** Show only the items that save money (a cheaper swap or equivalent, or a sale price). */
  onlySavings?: boolean;
  /** The list lines, so an alternative can be compared with the usual product for the same amount. */
  basket?: readonly BasketItem[];
  /** Store names by id, to say where the usual product is sold. */
  storeNames?: ReadonlyMap<string, string>;
}) {
  const savingOf = (item: PlanStop["items"][number]) => {
    const swap = swapsByLine.get(item.basketIndex);
    return !swap ? 0 : swap.to.id === item.product.id ? swap.savingsCents : item.checkoutCents - swap.toCents;
  };
  const shown = onlySavings ? stop.items.filter((i) => i.isSubstitute || savingOf(i) > 0 || i.product.salePrice !== undefined) : stop.items;
  return (
    <article aria-label={`Stop ${number}: ${stop.store.chain}`} className="rounded-2xl border bg-surface">
      <header className="flex items-center justify-between gap-4 border-b px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="grid size-7 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{number}</span>
          <div>
            <h3 className="font-semibold leading-tight">{stop.store.chain}</h3>
            <p className="text-xs text-muted-foreground">
              {stop.store.name} · {stop.store.address}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{stop.items.length} items</p>
          <Money cents={stop.subtotalCents} className="text-lg font-semibold" />
        </div>
      </header>
      <ul className="divide-y px-5">
        {shown.length === 0 ? <li className="py-3 text-sm text-muted-foreground">No discounted items at this store.</li> : null}
        {shown.map((item) => {
          const usual = productsById.get(item.usualProductId);
          // What the usual product would cost for the same amount, so the alternative button can compare the two.
          const line = basket[item.basketIndex];
          const usualCents = usual && line ? (checkoutCost(neededAmount(line, usual), usual)?.cents ?? null) : null;
          return (
            <li key={`${item.basketIndex}-${item.product.id}`} className="flex items-start justify-between gap-4 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {item.product.brand} {item.product.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.packages > 1 ? `${item.packages} × ` : ""}
                  {formatSize(item.product.sizeValue, item.product.sizeUnit)}
                  {item.isSubstitute && usual && usualCents !== null ? (
                    <AlternativeButton
                      usual={usual}
                      usualStore={storeNames.get(usual.storeId) ?? usual.storeId}
                      usualCents={usualCents}
                      chosen={item.product}
                      chosenStore={stop.store.chain}
                      chosenCents={item.checkoutCents}
                    />
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
