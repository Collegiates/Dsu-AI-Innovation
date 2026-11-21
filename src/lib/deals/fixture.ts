import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextWeekPricesSchema, type NextWeekPrices } from "./nextWeek";

/**
 * Reads the simulated next-week prices for the Deal Watch demo (data/fixtures/prices-next-week.json) and checks them.
 * The file must say "simulated": true. Returns null if it is missing or malformed, so the button is simply hidden.
 * Example: loadNextWeekPrices() → { simulated: true, changes: [{ productId: "...tide...", salePrice: 11.99 }, ...] }.
 */
export function loadNextWeekPrices(dir = join(process.cwd(), "data", "fixtures")): NextWeekPrices | null {
  try {
    const parsed = NextWeekPricesSchema.safeParse(JSON.parse(readFileSync(join(dir, "prices-next-week.json"), "utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
