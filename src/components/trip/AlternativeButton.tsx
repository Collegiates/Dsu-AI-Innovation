"use client";

import { ArrowLeftRight, ArrowRight, Tag } from "lucide-react";
import Link from "next/link";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Product } from "@/lib/data/schema";
import { formatSize } from "@/lib/pricing/money";
import { cn } from "@/lib/utils";

/**
 * The button on a Trip Plan item that the store sells as an alternative to the shopper's usual product.
 * It opens a popup comparing the two, side by side, with the difference computed by code: "save $0.47", or
 * "costs $0.12 more" when the winning store's closest match isn't cheaper. Example: Great Value milk $3.46 → Friendly Farms $2.99.
 */
export function AlternativeButton({
  usual,
  usualStore,
  usualCents,
  chosen,
  chosenStore,
  chosenCents,
}: {
  usual: Product;
  usualStore: string;
  usualCents: number;
  chosen: Product;
  chosenStore: string;
  chosenCents: number;
}) {
  const diff = usualCents - chosenCents;
  const saves = diff > 0;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "ml-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring",
            saves ? "bg-savings-soft text-savings" : "bg-primary-soft text-primary",
          )}
        >
          {saves ? <Tag aria-hidden className="size-3" /> : <ArrowLeftRight aria-hidden className="size-3" />}
          {saves ? (
            <>
              Alternative: save <Money cents={diff} />
            </>
          ) : (
            <>Alternative to your usual {usual.brand}</>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {saves ? (
              <>
                Save <Money cents={diff} /> on this item
              </>
            ) : (
              "Closest match at this store"
            )}
          </DialogTitle>
          <DialogDescription>
            {saves
              ? `${chosenStore} sells a cheaper product of the same kind as your usual one.`
              : `${chosenStore} doesn't sell your usual ${usual.brand} product, so this is the closest match it has${diff < 0 ? "" : ", at the same price"}.`}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            { title: "Your usual", p: usual, store: usualStore, cents: usualCents, highlight: false },
            { title: `At ${chosenStore}`, p: chosen, store: chosenStore, cents: chosenCents, highlight: true },
          ].map((c) => (
            <div key={c.title} className={cn("rounded-xl border p-3", c.highlight && "border-primary bg-primary-soft")}>
              <dt className="text-xs font-medium text-muted-foreground uppercase">{c.title}</dt>
              <dd className="mt-1">
                <p className="font-medium">
                  {c.p.brand} {c.p.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(c.p.sizeValue, c.p.sizeUnit)} · {c.store}
                </p>
                <Money cents={c.cents} className="mt-1 block text-lg font-semibold" />
              </dd>
            </div>
          ))}
        </dl>
        <p className={cn("text-sm font-medium", saves ? "text-savings" : "text-muted-foreground")}>
          {saves ? (
            <>
              You save <Money cents={diff} /> each week on this item.
            </>
          ) : diff < 0 ? (
            <>
              It costs <Money cents={-diff} /> more, but the whole trip is still cheapest at {chosenStore}.
            </>
          ) : (
            "Same price as your usual."
          )}
        </p>
        <Button asChild variant="outline" className="self-start">
          <Link href="/swaps">
            See all swaps <ArrowRight aria-hidden />
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
