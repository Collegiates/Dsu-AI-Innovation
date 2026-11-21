import { ArrowRight, CircleCheck, ShieldAlert, Tag } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";
import { Money } from "@/components/shared/Money";
import type { Store } from "@/lib/data/schema";
import type { Deal } from "@/lib/deals/detectDeals";
import type { RecallMatch } from "@/lib/recalls/match";

/**
 * "Needs your attention": at most one possible recall and the top two Deal Watch price drops, each linking to its page.
 * Red appears here only when there is a possible recall. Example: a recall card for Great Value Fruit Cocktail.
 */
export function AttentionStrip({ recall, recallCount, deals, stores }: { recall: RecallMatch | null; recallCount: number; deals: Deal[]; stores: Store[] }) {
  const chain = (id: string) => stores.find((s) => s.id === id)?.chain ?? id;
  const topDeals = deals.slice(0, 2);
  return (
    <section aria-labelledby="attention-title">
      <h2 id="attention-title" className="font-display text-xl font-semibold">Needs your attention</h2>
      <div className="mt-3 grid grid-cols-2 gap-5">
        {recall ? (
          <Link href="/recalls" className="group rounded-2xl border border-recall/30 bg-recall-soft p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-recall">
              <ShieldAlert aria-hidden className="size-4" />
              {recall.label}
            </p>
            <p className="mt-2 font-medium">{recall.productName}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {recall.classification} · {recall.reason}
            </p>
            <p className="mt-3 flex items-center gap-1 text-sm font-medium text-recall">
              {recallCount > 1 ? `See all ${recallCount} possible matches` : "See recall details"}
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
            </p>
          </Link>
        ) : (
          <EmptyState
            icon={CircleCheck}
            title="No recall matches for this week's list"
            description="Checked against FDA food recalls from the last 12 months."
            action={<Link href="/recalls" className="text-sm font-medium text-primary underline-offset-4 hover:underline">Recalls & Safety</Link>}
          />
        )}

        {topDeals.length > 0 ? (
          <div className="rounded-2xl border bg-surface p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-savings">
              <Tag aria-hidden className="size-4" />
              Deal Watch
            </p>
            <ul className="mt-2 divide-y">
              {topDeals.map((deal) => (
                <li key={deal.groupKey} className="flex items-center justify-between gap-4 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{deal.product.brand} {deal.product.name}</span>
                    <span className="text-sm text-muted-foreground">
                      at {chain(deal.storeId)}
                      {deal.savedCents > 0 ? (
                        <span className="text-savings"> · save <Money cents={deal.savedCents} /></span>
                      ) : deal.targetCents !== undefined ? (
                        <span className="text-savings"> · at or under your <Money cents={deal.targetCents} /> target</span>
                      ) : null}
                    </span>
                  </span>
                  <Money cents={deal.currentCents} className="shrink-0 font-semibold" />
                </li>
              ))}
            </ul>
            <Link href="/deals" className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
              Open Deal Watch <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        ) : (
          <EmptyState
            icon={Tag}
            title="No price drops on your waitlist"
            description="Deal Watch alerts you when a waitlist item drops 10% or hits your target."
            action={<Link href="/deals" className="text-sm font-medium text-primary underline-offset-4 hover:underline">Open Deal Watch</Link>}
          />
        )}
      </div>
    </section>
  );
}
