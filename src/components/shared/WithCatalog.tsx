import { connection } from "next/server";
import type { ReactNode } from "react";
import { tryLoadCatalog } from "@/lib/data/load";
import type { Product, Store } from "@/lib/data/schema";
import { ErrorState } from "./ErrorState";

/**
 * Loads the stores and products when the page is opened and hands them to the page's content.
 * If the data files aren't ready, it shows a plain message instead of the page, so no made-up prices ever appear.
 * Example: <WithCatalog>{({ products, stores }) => <TripPlanner products={products} stores={stores} />}</WithCatalog>.
 */
export async function WithCatalog({ children }: { children: (data: { products: Product[]; stores: Store[] }) => ReactNode }) {
  // Wait for a real request, so the data is read when the page is opened, not frozen at build time.
  await connection();
  const loaded = tryLoadCatalog();
  if (!loaded.ok) return <ErrorState title="Prices aren't ready yet" description={loaded.message} />;
  return children({ products: loaded.catalog.products, stores: loaded.catalog.stores });
}
