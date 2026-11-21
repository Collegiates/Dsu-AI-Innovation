"use client";

import { EyeOff, X } from "lucide-react";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { StorePicker } from "@/components/plan/StorePicker";
import { AddStoreForm } from "./AddStoreForm";
import { UsualListEditor } from "./UsualListEditor";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import type { Product, Store } from "@/lib/data/schema";
import { usePreference } from "@/lib/preferences/usePreference";

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border bg-surface p-6">
      <h2 id={id} className="font-display text-xl font-semibold">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function HiddenList({ items, label, empty, onRemove }: { items: { key: string; name: string }[]; label: string; empty: string; onRemove: (key: string) => void }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1 rounded-full border bg-background py-1 pr-1 pl-3 text-sm">
          {item.name}
          <Button variant="ghost" size="icon-xs" aria-label={`Show ${item.name} again`} onClick={() => onRemove(item.key)}>
            <X aria-hidden />
          </Button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Settings: your usual weekly list, the stores you shop at (the same picker as the Dashboard), adding a store,
 * and the brands and products hidden from Smart Swaps, each with a button to show it again.
 * Example: removing "Equate" from hidden brands lets Equate swaps appear on Smart Swaps again.
 */
export function SettingsView({ products, stores }: { products: Product[]; stores: Store[] }) {
  const { value: hiddenBrands, ready: brandsReady, save: saveBrands } = usePreference("hiddenBrands");
  const { value: hiddenProducts, ready: productsReady, save: saveProducts } = usePreference("hiddenProducts");
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const pricedStoreIds = useMemo(() => [...new Set(products.map((p) => p.storeId))], [products]);

  return (
    <div className="grid grid-cols-2 items-start gap-6">
      <div className="space-y-6">
        <UsualListEditor />
        <StorePicker stores={stores} pricedStoreIds={pricedStoreIds} columns={2} />
      </div>

      <div className="space-y-6">

        <AddStoreForm />
        <Section id="hidden-title" title="Hidden from Smart Swaps" description="Brands and products you chose never to see again.">
          {brandsReady && productsReady ? (
            <div className="space-y-5">
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <EyeOff aria-hidden className="size-4 text-muted-foreground" /> Brands
                </h3>
                <HiddenList
                  label="Hidden brands"
                  items={hiddenBrands.map((b) => ({ key: b, name: b }))}
                  empty="No hidden brands."
                  onRemove={(brand) => saveBrands((current) => current.filter((b) => b !== brand))}
                />
              </div>
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <EyeOff aria-hidden className="size-4 text-muted-foreground" /> Products
                </h3>
                <HiddenList
                  label="Hidden products"
                  items={hiddenProducts.map((id) => {
                    const p = productsById.get(id);
                    return { key: id, name: p ? `${p.brand} ${p.name}` : id };
                  })}
                  empty="No hidden products."
                  onRemove={(id) => saveProducts((current) => current.filter((x) => x !== id))}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Hide more with &ldquo;Never show again&rdquo; on{" "}
                <Link href="/swaps" className="font-medium text-primary underline-offset-4 hover:underline">
                  Smart Swaps
                </Link>
                .
              </p>
            </div>
          ) : (
            <LoadingSkeleton className="h-24" />
          )}
        </Section>
      </div>
    </div>
  );
}
