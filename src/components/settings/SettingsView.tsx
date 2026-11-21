"use client";

import { EyeOff, MapPin, X } from "lucide-react";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { PreferencePicker } from "@/components/shared/PreferencePicker";
import { Button } from "@/components/ui/button";
import { COMMUTE } from "@/lib/config/app";
import type { Product, Store } from "@/lib/data/schema";
import { usePreference } from "@/lib/preferences/usePreference";
import { detourText } from "@/lib/trip/detour";

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
 * Settings: the demo commute (read-only), the stores on it with their detours, the default trip preference,
 * and the brands and products hidden from Smart Swaps, each with a button to show it again.
 * Example: removing "Equate" from hidden brands lets Equate swaps appear on Smart Swaps again.
 */
export function SettingsView({ products, stores }: { products: Product[]; stores: Store[] }) {
  const { value: preference, ready: prefReady, save: savePreference } = usePreference("selectedPreference");
  const { value: hiddenBrands, ready: brandsReady, save: saveBrands } = usePreference("hiddenBrands");
  const { value: hiddenProducts, ready: productsReady, save: saveProducts } = usePreference("hiddenProducts");
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const ordered = [...stores].sort((a, b) => a.detourMinutes - b.detourMinutes || a.id.localeCompare(b.id));

  return (
    <div className="grid grid-cols-2 items-start gap-6">
      <div className="space-y-6">
        <Section id="commute-title" title="Commute" description="The drive the app plans your shopping around.">
          <p className="flex items-center gap-2 text-lg font-medium">
            <MapPin aria-hidden className="size-5 text-primary" />
            {COMMUTE.from} → {COMMUTE.to}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">This demo has one fixed route. Stores are compared by the extra drive they add to it.</p>
        </Section>

        <Section id="stores-title" title="Stores on your route" description="Extra driving each store adds compared with going straight home.">
          <table className="w-full text-sm">
            <thead className="sr-only">
              <tr>
                <th scope="col">Store</th>
                <th scope="col">Detour</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ordered.map((store) => (
                <tr key={store.id}>
                  <td className="py-2.5">
                    <p className="font-medium">{store.chain}</p>
                    <p className="text-xs text-muted-foreground">
                      {store.name} · {store.address}
                    </p>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    <p className="font-medium">{detourText(store)}</p>
                    <p className="text-xs text-muted-foreground">{store.onRouteLabel}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      <div className="space-y-6">
        <Section id="preference-title" title="Default trip preference" description="How the Trip Plan weighs your time against money. You can change it on the Trip Plan too.">
          {prefReady ? <PreferencePicker name="default-preference" value={preference} onChange={(v) => savePreference(v)} /> : <LoadingSkeleton className="h-11 w-96" />}
        </Section>

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
