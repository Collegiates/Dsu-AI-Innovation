import { describe, expect, it } from "vitest";
import { validateSwapExplanation, type KnownNames, type SwapFacts } from "./validators";

const facts: SwapFacts = {
  fromName: "Pantene Pro-V Shampoo Moisture Renewal",
  fromBrand: "Pantene",
  toName: "Equate Everyday Clean 2 in 1 Dandruff Shampoo & Conditioner",
  toBrand: "Equate",
  fromStore: "ALDI",
  toStore: "Walmart",
  fromPrice: "$6.35",
  toPrice: "$2.84",
  savings: "$3.51",
  savingsPercent: 55,
};
const known: KnownNames = { brands: ["Pantene", "Equate", "Head & Shoulders", "Great Value", "Tide"], stores: ["ALDI", "Walmart", "Food Lion", "Target"] };

describe("validateSwapExplanation", () => {
  it("accepts a sentence that only uses the computed facts", () => {
    expect(validateSwapExplanation("Equate at Walmart cleans just as well and saves you $3.51, about 55%, versus Pantene.", facts, known)).toEqual({ ok: true });
  });

  it("accepts the item prices too", () => {
    expect(validateSwapExplanation("Pay $2.84 instead of $6.35 by picking Equate.", facts, known)).toEqual({ ok: true });
  });

  it("rejects a wrong dollar amount", () => {
    const result = validateSwapExplanation("Switch to Equate and save $5.00 every week.", facts, known);
    expect(result).toEqual({ ok: false, reason: "amount $5.00 not in the facts" });
  });

  it("rejects a wrong amount written in words or cents", () => {
    expect(validateSwapExplanation("Save 4 dollars with Equate.", facts, known).ok).toBe(false);
    expect(validateSwapExplanation("Save 99 cents with Equate.", facts, known).ok).toBe(false);
  });

  it("rejects a wrong percentage", () => {
    expect(validateSwapExplanation("Equate saves you 70% on shampoo.", facts, known)).toEqual({ ok: false, reason: "percentage 70% not in the facts" });
  });

  it("rejects a product or brand that isn't in the facts", () => {
    const result = validateSwapExplanation("Head & Shoulders is even cheaper than Equate.", facts, known);
    expect(result).toEqual({ ok: false, reason: 'mentions "Head & Shoulders", which is not in the facts' });
  });

  it("rejects an invented store", () => {
    expect(validateSwapExplanation("Equate is cheaper at Kroger.", facts, known).ok).toBe(false);
    expect(validateSwapExplanation("Equate is cheaper at Food Lion.", facts, known).ok).toBe(false);
  });

  it("rejects text longer than 25 words", () => {
    const long = Array.from({ length: 26 }, () => "word").join(" ");
    expect(validateSwapExplanation(long, facts, known)).toEqual({ ok: false, reason: "too long (26 words)" });
  });

  it("rejects HTML and empty text", () => {
    expect(validateSwapExplanation('<img src=x onerror="alert(1)"> save', facts, known)).toEqual({ ok: false, reason: "contains HTML" });
    expect(validateSwapExplanation("   ", facts, known)).toEqual({ ok: false, reason: "empty" });
  });
});
