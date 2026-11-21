"use client";

import { ArrowRight, ChevronDown, CircleCheck, EyeOff, Info, ListChecks, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DataSourceNote } from "@/components/shared/DataSourceNote";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { postJson } from "@/lib/api/client";
import type { Product, Store } from "@/lib/data/schema";
import { basketFromEntries, replaceProduct, type ListEntry } from "@/lib/list/list";
import { SavingsThreshold } from "@/components/shared/SavingsThreshold";
import { usePreference } from "@/lib/preferences/usePreference";
import { weeklyToMonthlyCents } from "@/lib/pricing/monthly";
import { formatSize, formatUnitPrice } from "@/lib/pricing/money";
import type { Swap } from "@/lib/swaps/findSwaps";

/**
 * A swap as the API returns it: the code-computed numbers plus the checked explanation sentence.
 * The explanation's shape is written out here so this browser file never imports the server-only AI code.
 */
export type ExplainedSwap = Swap & { explanation: { text: string; source: "ai" | "template" } };

type Loaded = { key: string; entryIndexes: number[] } & ({ ok: true; swaps: ExplainedSwap[] } | { ok: false; message: string });

const unitLabel = (unit: string) => (unit === "load" ? "load" : unit);

/**
 * Smart Swaps: one row per cheaper similar product for items on the saved list, with unit prices, the weekly saving and
 * a one-sentence explanation (AI-written only if it passed every check, otherwise a template). "Try it" puts the
 * suggestion on the list; "Never show again" hides that product or its whole brand, with an undo.
 * Example: Great Value 2% milk $3.46 → Friendly Farms 2% milk $2.99 at ALDI, save $0.47 a week.
 */
export function SwapsView({ products, stores }: { products: Product[]; stores: Store[] }) {
  const { value: entries, ready: listReady, save: saveList } = usePreference("list");
  const { value: hiddenBrands, ready: brandsReady, save: saveBrands } = usePreference("hiddenBrands");
  const { value: hiddenProducts, ready: productsReady, save: saveProducts } = usePreference("hiddenProducts");
  const { value: minSavingsCents } = usePreference("minSavingsCents");
  const ready = listReady && brandsReady && productsReady;
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const { basket, entryIndexes } = useMemo(() => basketFromEntries(entries, productsById), [entries, productsById]);
  const requestKey = JSON.stringify({ basket, hiddenBrands, hiddenProducts });
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const chain = (storeId: string) => stores.find((s) => s.id === storeId)?.chain ?? storeId;

  useEffect(() => {
    if (!ready || basket.length === 0) return;
    let cancelled = false;
    const indexes = entryIndexes;
    postJson<{ swaps: ExplainedSwap[] }>("/api/swaps", { basket, hiddenBrands, hiddenProducts }).then((reply) => {
      if (cancelled) return;
      setLoaded(reply.ok ? { key: requestKey, entryIndexes: indexes, ok: true, swaps: reply.data.swaps } : { key: requestKey, entryIndexes: indexes, ok: false, message: reply.message });
    });
    return () => {
      cancelled = true;
    };
    // requestKey captures basket and hidden lists; listing them too would refetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, requestKey]);

  if (ready && basket.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No list to find swaps for"
        description="Add your weekly items on My List, and cheaper similar products will show up here."
        action={
          <Button asChild>
            <Link href="/list">Go to My List</Link>
          </Button>
        }
      />
    );
  }
  if (!ready || !loaded) return <SwapsSkeleton />;
  if (!loaded.ok) return <ErrorState title="Swaps couldn't be loaded" description={loaded.message} />;

  // Rows the shopper just hid disappear at once, before the refreshed list arrives.
  const hiddenBrandSet = new Set(hiddenBrands.map((b) => b.toLowerCase()));
  // Swaps below the shopper's savings threshold aren't recommended.
  const rows = loaded.swaps.filter(
    (s) => !hiddenProducts.includes(s.to.id) && !hiddenBrandSet.has(s.to.brand.toLowerCase()) && s.savingsCents >= minSavingsCents,
  );
  const weekly = rows.reduce((sum, s) => sum + s.savingsCents, 0);
  const refreshing = loaded.key !== requestKey;

  function tryIt(swap: ExplainedSwap) {
    const index = (loaded as Loaded).entryIndexes[swap.basketIndex];
    const previous = entries[index]?.productId;
    if (index === undefined || !previous) return;
    saveList((current) => replaceProduct(current, index, swap.to.id));
    toast.success(`${swap.to.brand} ${swap.to.name} is on your list`, {
      action: { label: "Undo", onClick: () => saveList((current) => replaceProduct(current, index, previous)) },
    });
  }

  function hide(kind: "product" | "brand", swap: ExplainedSwap) {
    if (kind === "product") {
      saveProducts((current) => (current.includes(swap.to.id) ? current : [...current, swap.to.id]));
      toast(`You won't see ${swap.to.brand} ${swap.to.name} again`, {
        action: { label: "Undo", onClick: () => saveProducts((current) => current.filter((id) => id !== swap.to.id)) },
      });
    } else {
      const brand = swap.to.brand;
      saveBrands((current) => (current.some((b) => b.toLowerCase() === brand.toLowerCase()) ? current : [...current, brand]));
      toast(`You won't see ${brand} products again`, {
        action: { label: "Undo", onClick: () => saveBrands((current) => current.filter((b) => b.toLowerCase() !== brand.toLowerCase())) },
      });
    }
  }

  return (
    <div className="space-y-5" aria-busy={refreshing}>
      <div className="flex items-end justify-between gap-6">
        <p className="text-muted-foreground">
          {rows.length > 0 ? (
            <>
              <span className="font-display text-2xl font-semibold text-foreground">
                Up to <Money cents={weekly} className="text-savings" /> a week · <Money cents={weeklyToMonthlyCents(weekly)} className="text-savings" /> a month
              </span>
              <span className="block text-sm">if you take all {rows.length} swaps. Prices compared per unit, so different sizes are fair.</span>
            </>
          ) : null}
        </p>
        <SavingsThreshold id="swaps-threshold" />
        <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline">
          <EyeOff aria-hidden className="size-4" />
          Manage hidden brands ({hiddenBrands.length + hiddenProducts.length})
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={CircleCheck} title="You're already buying the best value we found" description="No cheaper similar product at your stores for the items on your list." />
      ) : (
        <ul className="space-y-3">
          {rows.map((swap) => (
            <SwapRow
              key={swap.id}
              swap={swap}
              chain={chain}
              entry={entries[loaded.entryIndexes[swap.basketIndex]]}
              onTry={() => tryIt(swap)}
              onHide={(kind) => hide(kind, swap)}
            />
          ))}
        </ul>
      )}
      <DataSourceNote />
    </div>
  );
}

function SwapRow({
  swap,
  chain,
  entry,
  onTry,
  onHide,
}: {
  swap: ExplainedSwap;
  chain: (storeId: string) => string;
  entry: ListEntry | undefined;
  onTry: () => void;
  onHide: (kind: "product" | "brand") => void;
}) {
  const unit = unitLabel(swap.unit);
  return (
    <li aria-label={`Swap ${swap.from.brand} ${swap.from.name} for ${swap.to.brand} ${swap.to.name}`} className="rounded-2xl border bg-surface p-5">
      <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">You buy</p>
          <p className="truncate font-medium">
            {swap.from.brand} {swap.from.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatSize(swap.from.sizeValue, swap.from.sizeUnit)} · {chain(swap.from.storeId)} · <Money cents={swap.fromCents} /> ·{" "}
            {formatUnitPrice(swap.fromUnitPrice, unit)}
          </p>
        </div>
        <ArrowRight aria-hidden className="size-5 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Try instead</p>
          <p className="truncate font-medium">
            {swap.to.brand} {swap.to.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatSize(swap.to.sizeValue, swap.to.sizeUnit)} · {chain(swap.to.storeId)} · <Money cents={swap.toCents} /> ·{" "}
            <span className="font-medium text-savings">{formatUnitPrice(swap.toUnitPrice, unit)}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-semibold text-savings">
            <Money cents={swap.savingsCents} />
          </p>
          <p className="text-xs text-muted-foreground">a week · {swap.savingsPercent}% less</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 border-t pt-3">
        <p className="flex min-w-0 items-start gap-2 text-sm">
          <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            {swap.explanation.text}{" "}
            <span className="text-xs text-muted-foreground">{swap.explanation.source === "ai" ? "(AI-written, numbers checked)" : "(written from the computed numbers)"}</span>
            {swap.note ? <span className="block text-xs text-muted-foreground">Formulas differ between brands, so compare loads on the label.</span> : null}
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Info aria-hidden />
                How we chose this
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <ul className="space-y-1 text-left">
                <li>Same category: both are {swap.from.category.replace(/_/g, " ")}, the same kind of product.</li>
                <li>
                  Unit price: {formatUnitPrice(swap.toUnitPrice, unit)} vs. {formatUnitPrice(swap.fromUnitPrice, unit)}, and cheaper at the register too.
                </li>
                <li>Your list match: {entry?.label ?? "Same product"}{entry ? ` for “${entry.text}”` : ""}.</li>
              </ul>
            </TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <EyeOff aria-hidden />
                Never show again
                <ChevronDown aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Hide this suggestion</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => onHide("product")}>This product ({swap.to.name})</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onHide("brand")}>Everything from {swap.to.brand}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={onTry}>
            Try it
          </Button>
        </div>
      </div>
    </li>
  );
}

function SwapsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Finding cheaper swaps" className="space-y-3">
      {Array.from({ length: 4 }, (_, i) => (
        <LoadingSkeleton key={i} className="h-36" />
      ))}
    </div>
  );
}
