"use client";

import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { usePreference } from "@/lib/preferences/usePreference";

/**
 * Lets the shopper add a store they shop at (name and address). It is saved in this browser and appears in
 * "Your stores" with "No prices yet": the plan only uses stores whose prices have been collected.
 * Example: "Giant Food, 1 Main St, Dover, DE" → listed and tickable, never priced at $0.
 */
export function AddStoreForm() {
  const { value: custom, save } = usePreference("customStores");
  const { save: saveSelected } = usePreference("selectedStores");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [added, setAdded] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const n = name.trim();
    const a = address.trim();
    if (!n || !a) return;
    const id = `custom-${n.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${custom.length + 1}`;
    if (save([...custom, { id, name: n, address: a }].slice(-20))) {
      saveSelected((current) => [...new Set([...current, id])]);
      setName("");
      setAddress("");
      setAdded(n);
    }
  }

  return (
    <section aria-labelledby="add-store-title" className="rounded-2xl border bg-surface p-6">
      <h2 id="add-store-title" className="font-display text-xl font-semibold">
        Add a store
      </h2>
      <p className="text-sm text-muted-foreground">Shop somewhere else? Add it and it shows up in your stores.</p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div className="space-y-1">
          <label htmlFor="store-name" className="text-sm font-medium">
            Store name
          </label>
          <input
            id="store-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="Giant Food"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="store-address" className="text-sm font-medium">
            Address
          </label>
          <input
            id="store-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={200}
            placeholder="1 Main St, Dover, DE 19901"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!name.trim() || !address.trim()}>
            <Plus aria-hidden /> Add store
          </Button>
          <p role="status" className="text-sm text-muted-foreground">
            {added ? `${added} added to your stores.` : ""}
          </p>
        </div>
      </form>
    </section>
  );
}
