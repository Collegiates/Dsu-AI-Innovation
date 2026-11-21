import { Money } from "@/components/shared/Money";
import type { Store } from "@/lib/data/schema";
import type { TripPlan, TripResult } from "@/lib/trip/optimizer";
import { cn } from "@/lib/utils";

const storeNames = (plan: TripPlan, stores: readonly Store[]) =>
  plan.storeIds.map((id) => stores.find((s) => s.id === id)?.chain ?? id).join(" + ") || "No stops";

/**
 * Puts three trips side by side: the cheapest trip with only one store, the quickest trip, and the recommended one,
 * so the shopper can see what the recommendation trades. Every number comes from the trip planner.
 * Example: "Cheapest single store: ALDI, $57.52, +4 min" vs. "Recommended: Walmart + ALDI, $51.23, +14 min".
 */
export function PlanComparison({ result, stores }: { result: TripResult; stores: readonly Store[] }) {
  const columns: { title: string; plan: TripPlan | null; highlight?: boolean }[] = [
    { title: "Cheapest single store", plan: result.cheapestSingleStore },
    { title: "Fastest", plan: result.fastest },
    { title: "Recommended", plan: result.recommended, highlight: true },
  ];
  return (
    <section aria-labelledby="compare-title" className="rounded-2xl border bg-surface p-6">
      <h2 id="compare-title" className="font-display text-xl font-semibold">
        Compare trips
      </h2>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left">
            <th scope="col" className="w-44 pb-2 font-medium text-muted-foreground">
              <span className="sr-only">Measure</span>
            </th>
            {columns.map((c) => (
              <th key={c.title} scope="col" className={cn("px-4 pb-2 font-semibold", c.highlight && "rounded-t-lg bg-primary-soft text-primary")}>
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:px-4 [&_td]:py-2 [&_th]:py-2 [&_tr]:border-t">
          {[
            { label: "Stops", value: (p: TripPlan) => storeNames(p, stores) },
            { label: "Groceries + gas", value: (p: TripPlan) => <Money cents={p.checkoutTotalCents + p.gasCostCents} /> },
            { label: "Extra time", value: (p: TripPlan) => <span className="tabular-nums">+{p.extraMinutes} min</span> },
            { label: "Missing items", value: (p: TripPlan) => (p.missing.length === 0 ? "None" : `${p.missing.length}`) },
          ].map((row, i, rows) => (
            <tr key={row.label}>
              <th scope="row" className="text-left font-medium text-muted-foreground">
                {row.label}
              </th>
              {columns.map((c) => (
                <td key={c.title} className={cn(c.highlight && "bg-primary-soft font-medium", c.highlight && i === rows.length - 1 && "rounded-b-lg")}>
                  {c.plan ? row.value(c.plan) : "Not possible"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
