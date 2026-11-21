import { ArrowRight, PiggyBank } from "lucide-react";
import Link from "next/link";
import { DataSourceNote } from "@/components/shared/DataSourceNote";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { assumptions } from "@/lib/config/app";
import type { TripResult } from "@/lib/trip/optimizer";

const PREFERENCE_NAMES = { fastest: "Fastest", balanced: "Balanced", maxSavings: "Max savings" } as const;

/**
 * The Dashboard's main block: what this week's list costs with the recommended trip versus the usual trip,
 * and how much that saves in dollars and percent. "Typical" means the usual products at the usual store, plus gas.
 * Example: "You save $6.42 (14%) — $39.10 instead of $45.52".
 */
export function SavingsHero({ trip, itemCount }: { trip: TripResult; itemCount: number }) {
  const plan = trip.recommended;
  const optimized = plan.checkoutTotalCents + plan.gasCostCents;
  const typical = optimized + plan.savingsCents;
  const percent = typical > 0 ? Math.round((plan.savingsCents / typical) * 100) : 0;
  const saves = plan.savingsCents > 0;
  const width = (cents: number) => `${typical > 0 ? Math.max(8, Math.min(100, (cents / Math.max(typical, optimized)) * 100)) : 0}%`;

  return (
    <section aria-labelledby="savings-title" className="flex h-full flex-col rounded-2xl border bg-surface p-7">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <PiggyBank aria-hidden className="size-4 text-savings" />
          {itemCount} items on your list
        </p>
        <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
          {PREFERENCE_NAMES[trip.preference]} plan · time at ${assumptions.timeValuePerMinute[trip.preference].toFixed(2)}/min
        </span>
      </div>

      <h2 id="savings-title" className="mt-5 font-display text-5xl font-semibold tracking-tight">
        {saves ? (
          <>
            You save <Money cents={plan.savingsCents} className="text-savings" />
          </>
        ) : (
          "Your usual trip is the best value"
        )}
      </h2>
      <p className="mt-2 text-lg text-muted-foreground">
        {saves ? (
          <>
            <span className="font-semibold text-savings">{percent}% less</span> than your usual trip, gas included.
          </>
        ) : (
          "No other stop saves enough to be worth the drive this week."
        )}
      </p>

      <dl className="mt-7 space-y-3">
        <div>
          <div className="flex items-baseline justify-between text-sm">
            <dt className="text-muted-foreground">Typical (usual products, usual store)</dt>
            <dd className="font-medium"><Money cents={typical} /></dd>
          </div>
          <div className="mt-1.5 h-2.5 rounded-full bg-muted">
            <div className="h-full rounded-full bg-chart-3" style={{ width: width(typical) }} />
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between text-sm">
            <dt className="text-muted-foreground">Optimized trip</dt>
            <dd className="font-semibold"><Money cents={optimized} /></dd>
          </div>
          <div className="mt-1.5 h-2.5 rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: width(optimized) }} />
          </div>
        </div>
      </dl>

      {plan.missing.length > 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Not found at these stores: {plan.missing.map((m) => m.label).join(", ")}. Totals leave them out.
        </p>
      ) : null}

      <div className="mt-auto flex items-end justify-between gap-4 pt-7">
        <DataSourceNote />
        <Button asChild size="lg">
          <Link href="/trip">
            View trip plan <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}
