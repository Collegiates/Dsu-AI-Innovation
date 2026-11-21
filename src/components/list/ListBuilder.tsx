"use client";

import { ArrowRight, ListChecks, Minus, Plus, Receipt, Sparkles, Tag } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ConfidenceBadge } from "@/components/shared/ConfidenceBadge";
import { DataSourceNote } from "@/components/shared/DataSourceNote";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { minimumWait, ProgressOverlay } from "@/components/shared/ProgressOverlay";
import { postJson } from "@/lib/api/client";
import { RECEIPT_NOTES, uploadReceipt } from "@/lib/receipt/client";
import type { Product, Store } from "@/lib/data/schema";
import { entriesFromMatches, MAX_QUANTITY, parseListText, setQuantity, type ListEntry } from "@/lib/list/list";
import type { MatchResult } from "@/lib/matching/core";
import { addToWaitlist } from "@/lib/preferences/storage";
import { usePreference } from "@/lib/preferences/usePreference";
import { formatSize, toCents } from "@/lib/pricing/money";
import { effectivePrice } from "@/lib/pricing/price";
import { DEFAULT_USUAL_STORE_ID } from "@/lib/trip/optimizer";

const HINTS: Partial<Record<ListEntry["label"], string>> = {
  Similar: "Close match. Check it's what you usually buy.",
  "No match": "None of the stores lists this. Try a simpler name, like \"rice\" instead of a brand.",
};

/**
 * My List: the shopper types their weekly list (or loads the demo list, or uploads a receipt), the app matches each line to a real product,
 * and shows how sure it is. Quantities can be changed, occasional items moved to Deal Watch, and the list is saved
 * in the browser so the Trip Plan, Smart Swaps and Recalls pages use it. Example: "2% milk" → Great Value 2% milk, Same product.
 */
// The steps shown while the list is matched. Each one names work the app really does.
const MATCH_STEPS = [
  "Reading your list",
  "Finding similar products",
  "Checking category and variant",
  "Comparing unit prices",
  "Labeling how sure each match is",
] as const;

export function ListBuilder({ products, stores }: { products: Product[]; stores: Store[] }) {
  const { value: entries, ready, save } = usePreference("list");
  const { value: usualList } = usePreference("usualList");
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "loading" | "reading" } | { kind: "error"; message: string }>({ kind: "idle" });
  const [receiptNote, setReceiptNote] = useState<string | null>(null);
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const chain = (storeId: string) => stores.find((s) => s.id === storeId)?.chain ?? storeId;

  const text = draft ?? entries.map((e) => e.text).join("\n");
  const matched = entries.filter((e) => e.productId && productsById.has(e.productId));
  const counts = {
    same: entries.filter((e) => e.label === "Same product").length,
    similar: entries.filter((e) => e.label === "Similar").length,
    none: entries.filter((e) => e.label === "No match").length,
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const items = parseListText(text);
    if (items.length === 0) {
      setStatus({ kind: "error", message: "Type at least one item, one per line or separated by commas." });
      return;
    }
    await matchItems(items);
  }

  // Reads a receipt file (text by code, photo or PDF by AI on the server), fills the list with its items and matches them.
  async function onReceipt(file: File | undefined) {
    if (!file) return;
    setStatus({ kind: "reading" });
    const reply = await uploadReceipt(file);
    if (!reply.ok) {
      setStatus({ kind: "error", message: reply.message });
      return;
    }
    setReceiptNote(RECEIPT_NOTES[reply.data.source]);
    // When the receipt can't be read, plan the shopper's usual list (the page says so).
    const items = reply.data.source === "demo-sample" ? usualList : reply.data.items;
    setDraft(items.join("\n"));
    await matchItems(items);
  }

  async function matchItems(items: string[]) {
    setStatus({ kind: "loading" });
    // Matching always takes at least 5 seconds, so each progress step can be read during the demo.
    const waited = minimumWait(MATCH_STEPS.length);
    const [reply] = await Promise.all([postJson<{ results: MatchResult[] }>("/api/match", { items }), waited]);
    if (!reply.ok) {
      setStatus({ kind: "error", message: reply.message });
      return;
    }
    save((current) => entriesFromMatches(reply.data.results, DEFAULT_USUAL_STORE_ID, current));
    setDraft(null);
    setStatus({ kind: "idle" });
  }

  function moveToDealWatch(index: number) {
    const entry = entries[index];
    const product = entry.productId ? productsById.get(entry.productId) : undefined;
    if (!product) return;
    addToWaitlist(product.groupKey);
    save((current) => current.filter((_, i) => i !== index));
    toast.success(`Moved "${entry.text}" to Deal Watch`, { description: "You'll see it there with its best price." });
  }

  return (
    <div className="grid grid-cols-12 items-start gap-6">
      <form onSubmit={onSubmit} className="sticky top-20 col-span-4 space-y-4 rounded-2xl border bg-surface p-6">
        <div className="space-y-1.5">
          <label htmlFor="list-input" className="font-display text-lg font-semibold">
            Your list
          </label>
          <p id="list-help" className="text-sm text-muted-foreground">
            One item per line, or separate them with commas.
          </p>
        </div>
        <textarea
          id="list-input"
          aria-describedby="list-help"
          value={text}
          onChange={(e) => setDraft(e.target.value)}
          rows={16}
          maxLength={10_100}
          placeholder={"2% milk\neggs\nwhole wheat bread"}
          className="w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-ring"
        />
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={status.kind === "loading"}>
            <Sparkles aria-hidden />
            {status.kind === "loading" ? "Matching…" : "Match my list"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setDraft(usualList.join("\n"))}>
            Load my usual list
          </Button>
        </div>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-sm font-medium hover:bg-primary-soft/50 has-focus-visible:outline-2 has-focus-visible:outline-ring">
          <Receipt aria-hidden className="size-4 text-primary" />
          {status.kind === "reading" ? "Reading your receipt…" : "Upload a receipt"}
          <input
            type="file"
            accept="image/*,application/pdf,text/plain,.txt"
            className="sr-only"
            disabled={status.kind === "reading" || status.kind === "loading"}
            onChange={(e) => {
              void onReceipt(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {receiptNote ? (
          <p role="status" className="rounded-lg bg-primary-soft px-3 py-2 text-xs text-primary">
            {receiptNote}
          </p>
        ) : null}
        {status.kind === "loading" || status.kind === "reading" ? <ProgressOverlay title="Matching your list" steps={MATCH_STEPS} /> : null}
        {status.kind === "error" ? <ErrorState title="Your list couldn't be matched" description={status.message} /> : null}
      </form>

      <section aria-labelledby="matches-title" className="col-span-8 space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="matches-title" className="font-display text-xl font-semibold">
              Matched products
            </h2>
            <p className="text-sm text-muted-foreground">
              {entries.length > 0 ? `${counts.same} same · ${counts.similar} similar · ${counts.none} not found` : "Nothing matched yet"}
            </p>
          </div>
          {matched.length > 0 ? (
            <Button asChild size="lg">
              <Link href="/trip">
                Build my trip plan <ArrowRight aria-hidden />
              </Link>
            </Button>
          ) : (
            <Button size="lg" disabled>
              Build my trip plan <ArrowRight aria-hidden />
            </Button>
          )}
        </div>

        {!ready || status.kind === "loading" ? (
          <div aria-busy="true" aria-label="Matching your list" className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => (
              <LoadingSkeleton key={i} className="h-16" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Your list is empty"
            description="Type a few items on the left, upload a receipt, or load your usual list, then press Match my list."
          />
        ) : (
          <ul className="divide-y rounded-2xl border bg-surface">
            {entries.map((entry, index) => {
              const product = entry.productId ? productsById.get(entry.productId) : undefined;
              const hint = HINTS[entry.label];
              return (
                <li key={`${entry.text}-${index}`} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{product ? `${product.brand} ${product.name}` : `“${entry.text}”`}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-xs text-muted-foreground">
                      {product ? <span>“{entry.text}”</span> : null}
                      <ConfidenceBadge label={product ? entry.label : "No match"} className="shrink-0 py-0" />
                      {product ? (
                        <span>
                          {formatSize(product.sizeValue, product.sizeUnit)} · {chain(product.storeId)}
                        </span>
                      ) : null}
                    </p>
                    {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
                  </div>

                  {product ? <Money cents={toCents(effectivePrice(product))} className="text-sm font-medium" /> : <span />}

                  {product ? (
                    <div className="flex items-center rounded-lg border" role="group" aria-label={`Quantity of ${entry.text}`}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`One fewer ${entry.text}`}
                        disabled={entry.quantity <= 1}
                        onClick={() => save((c) => setQuantity(c, index, entry.quantity - 1))}
                      >
                        <Minus aria-hidden />
                      </Button>
                      <span className="w-7 text-center text-sm font-medium tabular-nums" aria-live="polite">
                        {entry.quantity}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`One more ${entry.text}`}
                        disabled={entry.quantity >= MAX_QUANTITY}
                        onClick={() => save((c) => setQuantity(c, index, entry.quantity + 1))}
                      >
                        <Plus aria-hidden />
                      </Button>
                    </div>
                  ) : (
                    <span />
                  )}

                  {product ? (
                    <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => moveToDealWatch(index)} aria-label={`Move ${entry.text} to Deal Watch`}>
                      <Tag aria-hidden />
                      Move to Deal Watch
                    </Button>
                  ) : (
                    <span />
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <DataSourceNote />
      </section>
    </div>
  );
}
