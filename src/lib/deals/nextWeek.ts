import { z } from "zod";
import type { Product } from "@/lib/data/schema";

/** The simulated next-week prices file (data/fixtures/prices-next-week.json). It must say it is simulated. */
export const NextWeekPricesSchema = z.object({
  simulated: z.literal(true),
  note: z.string().min(1),
  changes: z.array(z.object({ productId: z.string().min(1), salePrice: z.number().positive() }).strict()),
});
export type NextWeekPrices = z.infer<typeof NextWeekPricesSchema>;

/**
 * Builds "next week's" catalog for the Deal Watch demo: today's real products with the simulated sale prices applied.
 * A change is skipped if its product isn't in the catalog or the "sale" isn't actually lower than the price.
 * Example: Tide $14.29 with a change to $11.99 → the same product with salePrice 11.99.
 */
export function applyNextWeekPrices(products: readonly Product[], fixture: NextWeekPrices): { products: Product[]; applied: string[] } {
  const changes = new Map(fixture.changes.map((c) => [c.productId, c.salePrice]));
  const applied: string[] = [];
  const next = products.map((p) => {
    const sale = changes.get(p.id);
    if (sale === undefined || sale >= p.price) return p;
    applied.push(p.id);
    return { ...p, salePrice: sale };
  });
  return { products: next, applied };
}
