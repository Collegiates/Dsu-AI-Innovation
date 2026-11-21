import type { Product, Store } from "@/lib/data/schema";

// Small hand-made stores and products for tests, so tests stay stable when the real price data changes.

/** Builds a test store; only the fields a test cares about need to be given. */
export function makeStore(id: string, detourMinutes: number, detourMiles: number): Store {
  return { id, name: id, chain: id, address: "1 Test St, Dover, DE", onRouteLabel: "test", detourMinutes, detourMiles };
}

/** Builds a test product at a store with a price; the rest gets sensible defaults that can be overridden. */
export function makeProduct(storeId: string, name: string, price: number, overrides: Partial<Product> = {}): Product {
  return {
    id: `${storeId}--${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    storeId,
    brand: "Brand",
    name,
    sizeValue: 16,
    sizeUnit: "oz",
    price,
    category: "pantry",
    variant: "default",
    groupKey: "group",
    isStoreBrand: false,
    verification: "TEST",
    collectedAt: "2026-11-21",
    ...overrides,
  };
}
