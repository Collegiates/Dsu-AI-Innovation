import { ArrowRight, Trophy } from "lucide-react";
import Link from "next/link";
import { DataSourceNote } from "@/components/shared/DataSourceNote";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import type { StoreRanking } from "@/lib/trip/rankStores";

/**
 * The Dashboard's main block: this week's best single store for the whole list, what it saves against the
 * runner-up (on the items both sell), and every store's total as a bar. All numbers are computed by code.
 * Example: "Shop at ALDI: $57.34 · You save $1.20 vs. Walmart on the 4 items both stores sell".
 */
export function SavingsHero({ ranking, itemCount }: { ranking: StoreRanking; itemCount: number }) {
  const { winner, quotes, savings } = ranking;
  const max = Math.max(1, ...quotes.map((q) => q.totalCents));

  return (
    <section aria-labelledby="savings-title" className="flex h-full flex-col rounded-2xl border bg-surface p-7">
      <p className="flex items-center gap-2 text-sm font-medium text-primary">
        <Trophy aria-hidden className="size-4" />
        Best store this week · {itemCount} items on your list
      </p>

      <h2 id="savings-title" className="mt-4 font-display text-5xl font-semibold tracking-tight">
        {winner ? (
          <>
            Shop at {winner.store.chain}: <Money cents={winner.totalCents} />
          </>
        ) : (
          "None of your stores sells these items"
        )}
      </h2>
      <p className="mt-2 text-lg text-muted-foreground">
        {winner && savings && savings.sharedItems > 0 && savings.savingsCents > 0 ? (
          <>
            You save <Money cents={savings.savingsCents} className="font-semibold text-savings" /> vs. {savings.versus.chain} on the {savings.sharedItems} items
            both stores sell.
          </>
        ) : (
          "One trip, one store, the whole list."
        )}
      </p>

      <dl className="mt-7 space-y-3">
        {quotes.map((q) => (
          <div key={q.store.id}>
            <div className="flex items-baseline justify-between text-sm">
              <dt className={q === winner ? "font-semibold" : "text-muted-foreground"}>
                {q.store.chain}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {q.items} items
                  {q !== winner && q.winnerCentsForSameItems !== null ? (
                    <>
                      {" "}
                      (same items at {winner?.store.chain}: <Money cents={q.winnerCentsForSameItems} />)
                    </>
                  ) : null}
                </span>
              </dt>
              <dd className="font-medium">
                <Money cents={q.totalCents} />
              </dd>
            </div>
            <div className="mt-1.5 h-2.5 rounded-full bg-muted">
              <div className={q === winner ? "h-full rounded-full bg-primary" : "h-full rounded-full bg-chart-3"} style={{ width: `${Math.max(8, (q.totalCents / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </dl>

      <div className="mt-auto flex items-end justify-between gap-4 pt-7">
        <DataSourceNote />
        <Button asChild size="lg">
          <Link href="/trip">
            See the full list <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}
