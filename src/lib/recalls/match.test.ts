import { describe, expect, it } from "vitest";
import { makeProduct } from "@/lib/trip/test-fixtures";
import { keyWords, matchRecalls, RECALL_LABEL } from "./match";
import type { Recall } from "./schema";

const recall = (productDescription: string, extra: Partial<Recall> = {}): Recall => ({
  recallNumber: "H-0167-2027",
  reason: "Potential contamination with elevated levels of lead.",
  classification: "Class II",
  date: "2026-10-28",
  firm: "Pacific Coast Producers",
  productDescription,
  status: "Ongoing",
  ...extra,
});

const fruitCocktail = makeProduct("walmart-dover", "Fruit Cocktail in Fruit Juice", 1.18, { brand: "Great Value" });
const gvMilk = makeProduct("walmart-dover", "2% Reduced Fat Milk", 3.46, { brand: "Great Value" });
const berries = makeProduct("aldi-dover", "Frozen Berry Medley", 7.69, { brand: "Season's Choice" });
const tide = makeProduct("aldi-dover", "Free & Gentle Liquid Laundry Detergent", 14.29, { brand: "Tide" });

describe("recall matcher", () => {
  it("flags a product when the recall names its brand and a key product word, with all recall details", () => {
    const [match] = matchRecalls([fruitCocktail], [recall("Great Value Fruit Cocktail in Fruit Juice from Concentrate NET WT 15 OZ (425g)")]);
    expect(match).toEqual({
      productId: fruitCocktail.id,
      productName: "Great Value Fruit Cocktail in Fruit Juice",
      brand: "Great Value",
      recallNumber: "H-0167-2027",
      reason: "Potential contamination with elevated levels of lead.",
      classification: "Class II",
      date: "2026-10-28",
      firm: "Pacific Coast Producers",
      status: "Ongoing",
      matchedWords: ["cocktail", "juice"],
      label: "Possible match — check the lot code on your package",
    });
    expect(RECALL_LABEL).toBe("Possible match — check the lot code on your package");
  });

  it("does NOT flag a brand-only match (same brand, different product)", () => {
    expect(matchRecalls([gvMilk], [recall("Great Value Hawaiian Roll 4pk, dinner roll ready to eat")])).toEqual([]);
  });

  it("does NOT flag on a describing word like 'fat' (Fat Free Cottage Cheese is not 2% milk)", () => {
    expect(keyWords(gvMilk)).toEqual(["milk"]);
    expect(matchRecalls([gvMilk], [recall("Great Value Fat Free Cottage Cheese Small Curd 0% Milkfat NET WT 24OZ")])).toEqual([]);
  });

  it("does NOT flag a generic word like 'berries' without the brand", () => {
    expect(matchRecalls([berries], [recall("Organic Whole Mixed Berries, Net Wt. 48 oz. Keep Frozen.")])).toEqual([]);
  });

  it("matches the brand only as a whole phrase ('tide' inside 'peptides' doesn't count)", () => {
    expect(matchRecalls([tide], [recall("Type-1 Hydrolyzed Collagen Peptides with detergent-free formula")])).toEqual([]);
  });

  it("handles apostrophes in brands and lists newest recalls first", () => {
    const older = recall("SEASONS CHOICE Frozen Berry Medley 32 oz", { recallNumber: "H-0001-2026", date: "2026-01-05" });
    const newer = recall("Season's Choice berry medley, 16 oz", { recallNumber: "H-0002-2026", date: "2026-06-01" });
    expect(matchRecalls([berries], [older, newer]).map((m) => m.recallNumber)).toEqual(["H-0002-2026", "H-0001-2026"]);
  });

  it("returns nothing for an empty list or no recalls", () => {
    expect(matchRecalls([], [recall("Great Value Fruit Cocktail")])).toEqual([]);
    expect(matchRecalls([fruitCocktail], [])).toEqual([]);
  });
});
