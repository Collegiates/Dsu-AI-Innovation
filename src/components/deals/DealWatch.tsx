"use client";

import { FlaskConical, Mail, RotateCcw, Tag, Trash2, TrendingDown } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { DEMO_WAITLIST } from "@/lib/config/demo";
import type { Product, Store } from "@/lib/data/schema";
import { detectDeals, type Deal, type WaitlistItem } from "@/lib/deals/detectDeals";
import { applyNextWeekPrices, type NextWeekPrices } from "@/lib/deals/nextWeek";
import { usePreference } from "@/lib/preferences/usePreference";
import { formatSize, toCents } from "@/lib/pricing/money";
import { effectivePrice } from "@/lib/pricing/price";
import { cn } from "@/lib/utils";

/** The cheapest product in a waitlist group today, or undefined if no store on the route sells it. */
function cheapestNow(groupKey: string, products: readonly Product[]): Product | undefined {
  return products
    .filter((p) => p.groupKey === groupKey)
    .sort((a, b) => effectivePrice(a) - effectivePrice(b) || a.id.localeCompare(b.id))[0];
}

/**
 * Deal Watch: the waitlist of occasional buys, each with today's best price, its store and an optional target price.
 * The clearly labeled "Simulate next week's prices" button applies the simulated fixture and highlights items whose
 * price dropped 10% or more or reached the target (old price struck through, new price, % saved, store).
 * Example: Tide Free & Gentle $14.29 → $11.99 at ALDI, 16% less.
 */
export function DealWatch({ products, stores, nextWeek }: { products: Product[]; stores: Store[]; nextWeek: NextWeekPrices | null }) {
  const { value: waitlist, ready, save } = usePreference("waitlist");
  const [simulated, setSimulated] = useState(false);
  const chain = (storeId: string) => stores.find((s) => s.id === storeId)?.chain ?? storeId;

  // This week, only target prices can be met (nothing to compare with); next week's simulated prices can also drop.
  const deals = useMemo(() => {
    const current = simulated && nextWeek ? applyNextWeekPrices(products, nextWeek).products : products;
    return new Map<string, Deal>(detectDeals(waitlist, current, products).map((d) => [d.groupKey, d]));
  }, [simulated, nextWeek, products, waitlist]);

  if (!ready) return <LoadingSkeleton className="h-80" />;
  if (waitlist.length === 0) {
    return (
      <EmptyState
        icon={Tag}
        title="Your waitlist is empty"
        description="Add things you buy now and then (toothpaste, shampoo) and buy them when they're cheap. Use 'Move to Deal Watch' on My List, or load the demo waitlist."
        action={
          <div className="flex gap-2">
            <Button onClick={() => save([...DEMO_WAITLIST])}>Load demo waitlist</Button>
            <Button asChild variant="outline">
              <Link href="/list">Go to My List</Link>
            </Button>
          </div>
        }
      />
    );
  }

  const setTarget = (groupKey: string, text: string) => {
    const value = Number.parseFloat(text);
    save((current) =>
      current.map((w): WaitlistItem => (w.groupKey !== groupKey ? w : Number.isFinite(value) && value > 0 ? { groupKey, targetPrice: Math.round(value * 100) / 100 } : { groupKey })),
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-6 rounded-2xl border bg-surface p-5">
        <div className="flex items-start gap-3">
          <FlaskConical aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">{simulated ? "Showing simulated prices for next week" : "Want to see an alert?"}</p>
            <p className="text-sm text-muted-foreground">
              {simulated
                ? "These sale prices are made up for the demo. They are not real prices."
                : "Simulate next week's prices to see which waitlist items would drop. The prices are made up for the demo."}
            </p>
          </div>
        </div>
        {nextWeek ? (
          simulated ? (
            <Button variant="outline" onClick={() => setSimulated(false)}>
              <RotateCcw aria-hidden />
              Back to this week&apos;s prices
            </Button>
          ) : (
            <Button onClick={() => setSimulated(true)}>
              <FlaskConical aria-hidden />
              Simulate next week&apos;s prices
            </Button>
          )
        ) : (
          <p className="text-sm text-muted-foreground">Simulated prices aren&apos;t available.</p>
        )}
      </div>

      {simulated ? (
        <p role="status" className="text-sm font-medium">
          {deals.size === 0 ? "No waitlist item is a deal next week." : `${deals.size} of ${waitlist.length} waitlist items are deals next week.`}
        </p>
      ) : null}

      <ul className="divide-y rounded-2xl border bg-surface">
        {waitlist.map((item) => {
          const best = cheapestNow(item.groupKey, products);
          const deal = deals.get(item.groupKey);
          const product = deal?.product ?? best;
          return (
            <li
              key={item.groupKey}
              aria-label={product ? `${product.brand} ${product.name}` : item.groupKey}
              className={cn("grid grid-cols-[1fr_auto_auto_auto] items-center gap-6 px-5 py-4", deal && "bg-savings-soft/60")}
            >
              <div className="min-w-0">
                {product ? (
                  <>
                    <p className="truncate font-medium">
                      {product.brand} {product.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatSize(product.sizeValue, product.sizeUnit)} · cheapest at {chain(product.storeId)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">{item.groupKey}</p>
                    <p className="text-sm text-muted-foreground">No store on your route sells this right now.</p>
                  </>
                )}
              </div>

              <div className="text-right">
                {deal ? (
                  <>
                    <p className="flex items-center justify-end gap-2">
                      {deal.previousCents !== null && deal.savedCents > 0 ? (
                        <s className="text-sm text-muted-foreground" aria-label={`was ${(deal.previousCents / 100).toFixed(2)} dollars`}>
                          <Money cents={deal.previousCents} />
                        </s>
                      ) : null}
                      <Money cents={deal.currentCents} className="text-lg font-semibold text-savings" />
                    </p>
                    <p className="flex items-center justify-end gap-1 text-xs font-medium text-savings">
                      <TrendingDown aria-hidden className="size-3.5" />
                      {deal.dropPercent !== null && deal.dropPercent > 0 ? `${deal.dropPercent}% less at ${chain(deal.storeId)}` : `at ${chain(deal.storeId)}`}
                      {deal.reasons.includes("target") ? " · at or under your target" : ""}
                    </p>
                  </>
                ) : best ? (
                  <>
                    <Money cents={toCents(effectivePrice(best))} className="text-lg font-semibold" />
                    <p className="text-xs text-muted-foreground">{simulated ? "No drop next week" : "Best price today"}</p>
                  </>
                ) : null}
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Target
                <span className="relative">
                  <span aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2">
                    $
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max="10000"
                    step="0.01"
                    placeholder="optional"
                    aria-label={`Target price for ${product ? `${product.brand} ${product.name}` : item.groupKey}`}
                    defaultValue={item.targetPrice?.toFixed(2) ?? ""}
                    onBlur={(e) => setTarget(item.groupKey, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    className="w-28 rounded-md border bg-background py-1.5 pr-2 pl-6 text-foreground tabular-nums focus-visible:outline-2 focus-visible:outline-ring"
                  />
                </span>
              </label>

              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${product ? `${product.brand} ${product.name}` : item.groupKey} from Deal Watch`}
                onClick={() => save((current) => current.filter((w) => w.groupKey !== item.groupKey))}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          );
        })}
      </ul>

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Mail aria-hidden className="size-4 shrink-0" />
        In the full product, prices are checked automatically every week and alerts are sent by email.
      </p>
    </div>
  );
}
