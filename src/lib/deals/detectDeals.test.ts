import { describe, expect, it } from "vitest";
import { makeProduct } from "@/lib/trip/test-fixtures";
import { detectDeals } from "./detectDeals";

const tideNow = (salePrice?: number) => makeProduct("aldi-dover", "Tide", 14.29, { groupKey: "detergent", salePrice });
const tideBefore = makeProduct("aldi-dover", "Tide", 14.29, { groupKey: "detergent" });

describe("detectDeals", () => {
  it("flags a drop of at least 10%, with the store and the amount saved", () => {
    const [deal] = detectDeals([{ groupKey: "detergent" }], [tideNow(11.99)], [tideBefore]);
    expect(deal).toMatchObject({ storeId: "aldi-dover", previousCents: 1429, currentCents: 1199, savedCents: 230, dropPercent: 16, reasons: ["price-drop"] });
  });

  it("counts a drop of exactly 10% but not 9%", () => {
    const before = makeProduct("a", "Soap", 10, { groupKey: "soap" });
    expect(detectDeals([{ groupKey: "soap" }], [{ ...before, salePrice: 9 }], [before])).toHaveLength(1);
    expect(detectDeals([{ groupKey: "soap" }], [{ ...before, salePrice: 9.1 }], [before])).toEqual([]);
  });

  it("flags a price at or below the shopper's target, even with a small drop", () => {
    const towels = makeProduct("walmart-dover", "Towels", 8.12, { groupKey: "towels" });
    const [deal] = detectDeals([{ groupKey: "towels", targetPrice: 7.5 }], [{ ...towels, salePrice: 7.49 }], [towels]);
    expect(deal).toMatchObject({ reasons: ["target"], targetCents: 750, currentCents: 749, savedCents: 63 });
  });

  it("gives no alert when the price didn't drop", () => {
    expect(detectDeals([{ groupKey: "detergent" }], [tideNow()], [tideBefore])).toEqual([]);
    expect(detectDeals([{ groupKey: "detergent", targetPrice: 10 }], [tideNow()], [tideBefore])).toEqual([]);
  });

  it("picks the cheapest qualifying product per waitlist item", () => {
    const a = makeProduct("aldi", "A", 10, { groupKey: "g" });
    const b = makeProduct("walmart", "B", 10, { groupKey: "g" });
    const [deal] = detectDeals([{ groupKey: "g" }], [{ ...a, salePrice: 8 }, { ...b, salePrice: 7 }], [a, b]);
    expect(deal.product.id).toBe(b.id);
  });

  it("handles an empty waitlist or an unknown group", () => {
    expect(detectDeals([], [tideNow(1)], [tideBefore])).toEqual([]);
    expect(detectDeals([{ groupKey: "nothing" }], [tideNow(1)], [tideBefore])).toEqual([]);
  });
});
