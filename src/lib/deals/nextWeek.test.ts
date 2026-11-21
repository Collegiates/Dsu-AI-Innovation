import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEMO_WAITLIST } from "@/lib/config/demo";
import { makeProduct } from "@/lib/trip/test-fixtures";
import { evalCatalog } from "../../../tests/ai-eval/catalog";
import { detectDeals } from "./detectDeals";
import { applyNextWeekPrices, NextWeekPricesSchema } from "./nextWeek";

const fixture = NextWeekPricesSchema.parse(JSON.parse(readFileSync("data/fixtures/prices-next-week.json", "utf8")));

describe("simulated next-week prices", () => {
  it("is marked as simulated and discounts exactly 3 real catalog products", () => {
    const { products } = evalCatalog();
    const { applied } = applyNextWeekPrices(products, fixture);
    expect(fixture.simulated).toBe(true);
    expect(applied).toHaveLength(3);
  });

  it("makes the demo waitlist show 3 deals and leaves shampoo without an alert", () => {
    const { products } = evalCatalog();
    const next = applyNextWeekPrices(products, fixture).products;
    const deals = detectDeals(DEMO_WAITLIST, next, products);
    expect(deals.map((d) => d.groupKey)).toEqual(["toothpaste-fluoride-whitening", "paper-towels-6roll", "detergent-liquid-freeclear"]);
  });

  it("skips changes for unknown products or 'sales' that aren't cheaper", () => {
    const p = makeProduct("a", "Soap", 2);
    const result = applyNextWeekPrices([p], { simulated: true, note: "x", changes: [{ productId: "nope", salePrice: 1 }, { productId: p.id, salePrice: 3 }] });
    expect(result.applied).toEqual([]);
    expect(result.products[0]).toBe(p);
  });
});
