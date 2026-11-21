"use client";

import { Tag } from "lucide-react";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Product } from "@/lib/data/schema";
import { checkoutCost } from "@/lib/pricing/price";
import { neededAmount, type BasketItem } from "@/lib/trip/basket";
import type { TripPlan } from "@/lib/trip/optimizer";

/** One discounted item: what the trip buys, where, and how much less it costs than the usual product. */
type DiscountItem = { key: string; name: string; store: string; usualName: string; savingCents: number; onSale: boolean };

/**
 * Finds the items in a trip that cost less than the shopper's usual product for that line (a cheaper swap or
 * equivalent), or that are on sale. Every saving is computed by code from catalog prices.
 * Example: Friendly Farms 2% milk at ALDI $2.99 instead of Great Value $3.46 → saving 47 cents.
 */
export function discountItems(plan: TripPlan, basket: readonly BasketItem[], productsById: ReadonlyMap<string, Product>): DiscountItem[] {
  const items: DiscountItem[] = [];
  for (const stop of plan.stops) {
    for (const item of stop.items) {
      const usual = productsById.get(item.usualProductId);
      const line = basket[item.basketIndex];
      const usualCost = usual && line ? checkoutCost(neededAmount(line, usual), usual) : null;
      const savingCents = usualCost ? usualCost.cents - item.checkoutCents : 0;
      const onSale = item.product.salePrice !== undefined;
      if (savingCents <= 0 && !onSale) continue;
      items.push({
        key: `${item.basketIndex}-${item.product.id}`,
        name: `${item.product.brand} ${item.product.name}`,
        store: stop.store.chain,
        usualName: usual ? `${usual.brand} ${usual.name}` : "",
        savingCents: Math.max(0, savingCents),
        onSale,
      });
    }
  }
  return items.sort((a, b) => b.savingCents - a.savingCents);
}

/**
 * The "Overview" button on the Trip Plan: opens a popup listing exactly which items are discounted,
 * at which store, and how much each saves compared with the usual product, plus the total.
 * Example: "4 discounted items · you save $1.62".
 */
export function SavingsOverview({
  plan,
  basket,
  productsById,
  minSavingsCents = 0,
}: {
  plan: TripPlan;
  basket: readonly BasketItem[];
  productsById: ReadonlyMap<string, Product>;
  /** Items saving less than this a week are left out, matching the shopper's threshold. */
  minSavingsCents?: number;
}) {
  const items = discountItems(plan, basket, productsById).filter((i) => i.savingCents >= Math.max(1, minSavingsCents) || (minSavingsCents === 0 && i.onSale));
  const total = items.reduce((sum, i) => sum + i.savingCents, 0);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Tag aria-hidden /> Overview: {items.length} discounted item{items.length === 1 ? "" : "s"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Your discounted items</DialogTitle>
          <DialogDescription>
            {items.length === 0 ? (
              "Nothing on this trip is cheaper than your usual products."
            ) : (
              <>
                {items.length} item{items.length === 1 ? "" : "s"} cost less than what you usually buy. You save <Money cents={total} className="font-semibold text-savings" /> in total.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        {items.length > 0 ? (
          <ul aria-label="Discounted items" className="max-h-96 divide-y overflow-y-auto">
            {items.map((i) => (
              <li key={i.key} className="flex items-start justify-between gap-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{i.name}</p>
                  <p className="text-xs text-muted-foreground">
                    at {i.store}
                    {i.usualName && i.usualName !== i.name ? ` · instead of ${i.usualName}` : ""}
                    {i.onSale ? " · on sale" : ""}
                  </p>
                </div>
                {i.savingCents > 0 ? (
                  <span className="shrink-0 text-sm font-semibold text-savings">
                    save <Money cents={i.savingCents} />
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
