import { describe, expect, it } from "vitest";
import type { MatchResult } from "@/lib/matching/core";
import { makeProduct } from "@/lib/trip/test-fixtures";
import { basketFromEntries, entriesFromMatches, ListEntrySchema, parseListText, replaceProduct, setQuantity, type ListEntry } from "./list";

const walmartMilk = makeProduct("walmart-dover", "Milk", 3.46, { groupKey: "milk", sizeValue: 1, sizeUnit: "gal" });
const aldiMilk = makeProduct("aldi-dover", "Milk", 2.99, { groupKey: "milk", sizeValue: 1, sizeUnit: "gal" });
const byId = new Map([walmartMilk, aldiMilk].map((p) => [p.id, p]));

const match = (input: string, label: MatchResult["label"], options = [aldiMilk, walmartMilk]): MatchResult => ({
  input,
  label,
  method: "keywords",
  score: 1,
  groupKey: label === "No match" ? null : "milk",
  best: label === "No match" ? null : options[0],
  options: label === "No match" ? [] : options,
  otherVariants: [],
});

describe("parseListText", () => {
  it("splits on new lines and commas, trims, and drops blanks and repeats", () => {
    expect(parseListText("milk, eggs\n\n  Eggs \nwhole   wheat bread")).toEqual(["milk", "eggs", "whole wheat bread"]);
  });

  it("returns nothing for empty input", () => {
    expect(parseListText("  \n , ,\n")).toEqual([]);
  });

  it("cuts long lines to 100 characters and keeps at most 100 items", () => {
    expect(parseListText("x".repeat(150))[0]).toHaveLength(100);
    expect(parseListText(Array.from({ length: 150 }, (_, i) => `item ${i}`).join("\n"))).toHaveLength(100);
  });
});

describe("entriesFromMatches", () => {
  it("picks the usual store's product, keeps quantities, and never assigns a product to 'No match'", () => {
    const previous: ListEntry[] = [{ text: "milk", quantity: 3, label: "Same product", productId: walmartMilk.id }];
    const entries = entriesFromMatches([match("Milk", "Same product"), match("lawn mower", "No match")], "walmart-dover", previous);
    expect(entries).toEqual([
      { text: "Milk", quantity: 3, label: "Same product", productId: walmartMilk.id },
      { text: "lawn mower", quantity: 1, label: "No match", productId: null },
    ]);
  });

  it("falls back to the cheapest match when the usual store doesn't sell it", () => {
    expect(entriesFromMatches([match("milk", "Similar", [aldiMilk])], "walmart-dover")[0].productId).toBe(aldiMilk.id);
  });
});

describe("basketFromEntries", () => {
  it("turns quantities into amounts and keeps track of which list line each basket item came from", () => {
    const entries: ListEntry[] = [
      { text: "rocket fuel", quantity: 1, label: "No match", productId: null },
      { text: "milk", quantity: 2, label: "Same product", productId: walmartMilk.id },
      { text: "aldi milk", quantity: 1, label: "Similar", productId: aldiMilk.id },
    ];
    const { basket, entryIndexes, unmatched } = basketFromEntries(entries, byId);
    expect(basket).toEqual([{ usualProductId: walmartMilk.id, amount: { value: 2, unit: "gal" } }, { usualProductId: aldiMilk.id }]);
    expect(entryIndexes).toEqual([1, 2]);
    expect(unmatched).toEqual(["rocket fuel"]);
  });

  it("treats a product that is no longer in the catalog as unmatched instead of pricing it", () => {
    const { basket, unmatched } = basketFromEntries([{ text: "old", quantity: 1, label: "Same product", productId: "gone" }], byId);
    expect(basket).toEqual([]);
    expect(unmatched).toEqual(["old"]);
  });
});

describe("list edits", () => {
  const list: ListEntry[] = [{ text: "milk", quantity: 1, label: "Same product", productId: walmartMilk.id }];

  it("keeps quantities between 1 and 20", () => {
    expect(setQuantity(list, 0, 5)[0].quantity).toBe(5);
    expect(setQuantity(list, 0, 0)[0].quantity).toBe(1);
    expect(setQuantity(list, 0, 99)[0].quantity).toBe(20);
  });

  it("replaces a line's product without changing the original list", () => {
    expect(replaceProduct(list, 0, aldiMilk.id)[0].productId).toBe(aldiMilk.id);
    expect(list[0].productId).toBe(walmartMilk.id);
  });

  it("rejects saved lines with a bad shape", () => {
    expect(ListEntrySchema.safeParse({ text: "milk", quantity: 0, label: "Same product", productId: null }).success).toBe(false);
    expect(ListEntrySchema.safeParse({ text: "milk", quantity: 1, label: "Maybe", productId: null }).success).toBe(false);
  });
});
