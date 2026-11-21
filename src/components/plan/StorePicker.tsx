"use client";

import type { Store } from "@/lib/data/schema";
import { usePreference } from "@/lib/preferences/usePreference";
import { cn } from "@/lib/utils";

/**
 * Lets the shopper tick the stores they want to shop at; the Trip Plan only uses ticked stores.
 * Each store shows its name and address. Any store can be ticked; one with no collected prices yet says so,
 * and the Trip Plan skips it until its prices are added. Example: Walmart and ALDI are ticked by default; Food Lion says "No prices yet".
 */
export function StorePicker({ stores, pricedStoreIds, columns = 4 }: { stores: Pick<Store, "id" | "name" | "address">[]; pricedStoreIds: string[]; columns?: 1 | 2 | 4 }) {
  const { value: selected, ready, save } = usePreference("selectedStores");
  const { value: custom } = usePreference("customStores");
  const priced = new Set(pricedStoreIds);
  // Stores added in Settings are listed too; they have no prices yet.
  const all = [...stores, ...custom.filter((c) => !stores.some((s) => s.id === c.id))];
  // Priced stores first, then by name, so the choices that work are on top.
  const ordered = [...all].sort((a, b) => Number(priced.has(b.id)) - Number(priced.has(a.id)) || a.name.localeCompare(b.name));

  const toggle = (id: string, checked: boolean) =>
    save((current) => (checked ? [...new Set([...current, id])] : current.filter((s) => s !== id)));

  return (
    <section aria-labelledby="stores-title" className={cn("rounded-2xl border bg-surface", columns === 1 ? "px-5 py-4" : "p-5")}>
      <h2 id="stores-title" className="font-display text-xl font-semibold">
        Your stores
      </h2>
      {columns === 1 ? null : <p className="text-sm text-muted-foreground">Your trip plan only uses the stores you tick.</p>}
      <fieldset className={cn("mt-3 grid", columns === 1 ? "gap-2" : "gap-3", { 1: "grid-cols-1", 2: "grid-cols-2", 4: "grid-cols-4" }[columns])} aria-busy={!ready}>
        <legend className="sr-only">Stores to shop at</legend>
        {ordered.map((store) => {
          const hasPrices = priced.has(store.id);
          const checked = ready && selected.includes(store.id);
          return (
            <label
              key={store.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-4",
                columns === 1 ? "py-1.5" : "py-3",
                "cursor-pointer hover:bg-primary-soft/50",
                checked && "border-primary bg-primary-soft",
              )}
            >
              <input
                type="checkbox"
                className="mt-1 size-4 accent-primary"
                checked={checked}
                disabled={!ready}
                onChange={(e) => toggle(store.id, e.target.checked)}
              />
              <span>
                <span className="block font-medium">
                  {store.name}
                  {hasPrices ? null : <span className="ml-2 text-xs font-medium text-muted-foreground">No prices yet</span>}
                </span>
                <span className={cn("block text-muted-foreground", columns === 1 ? "text-xs" : "text-sm")}>{store.address}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
    </section>
  );
}
