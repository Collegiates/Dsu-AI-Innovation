import { beforeEach, describe, expect, it, vi } from "vitest";
import { findSwaps } from "@/lib/swaps/findSwaps";
import { makeProduct, makeStore } from "@/lib/trip/test-fixtures";
import { clearExplanationCache, explainSwap, explanationPrompt, swapFacts } from "./explainSwap";
import { AiUnavailableError, generateJson } from "./gemini";

vi.mock("./gemini", async (importOriginal) => ({ ...(await importOriginal<typeof import("./gemini")>()), generateJson: vi.fn() }));
const generate = vi.mocked(generateJson);

const usual = makeProduct("walmart-dover", "Creamy Peanut Butter", 1.98, { brand: "Great Value", groupKey: "peanut-butter-creamy", variant: "creamy" });
const cheaper = makeProduct("aldi-dover", "Creamy Peanut Butter Spread", 1.65, { brand: "Peanut Delight", groupKey: "peanut-butter-creamy", variant: "creamy" });
const [swap] = findSwaps({ basket: [{ usualProductId: usual.id }], products: [usual, cheaper] });
const stores = new Map([
  ["walmart-dover", { ...makeStore("walmart-dover", 0, 0), chain: "Walmart" }],
  ["aldi-dover", { ...makeStore("aldi-dover", 4, 1), chain: "ALDI" }],
]);
const known = { brands: ["Great Value", "Peanut Delight", "Jif"], stores: ["Walmart", "ALDI"] };

describe("explainSwap", () => {
  beforeEach(() => {
    clearExplanationCache();
    generate.mockReset();
  });

  it("passes only code-computed facts to the AI", () => {
    const facts = swapFacts(swap, stores);
    expect(facts).toMatchObject({ fromPrice: "$1.98", toPrice: "$1.65", savings: "$0.33", savingsPercent: 17, toStore: "ALDI" });
    expect(explanationPrompt(facts)).toContain(`<facts>${JSON.stringify(facts)}</facts>`);
  });

  it("uses the AI sentence when it passes every check, and caches it by swap id", async () => {
    generate.mockResolvedValue({ sentence: "Peanut Delight at ALDI saves you $0.33 (17%) over Great Value." });
    const first = await explainSwap(swap, stores, known);
    const second = await explainSwap(swap, stores, known);
    expect(first).toEqual({ text: "Peanut Delight at ALDI saves you $0.33 (17%) over Great Value.", source: "ai" });
    expect(second).toEqual(first);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("falls back to the template when the AI invents a number", async () => {
    generate.mockResolvedValue({ sentence: "Save $2.00 a jar with Peanut Delight!" });
    const result = await explainSwap(swap, stores, known);
    expect(result.source).toBe("template");
    expect(result.rejectedReason).toBe("amount $2.00 not in the facts");
    expect(result.text).toBe("Switch to Peanut Delight Creamy Peanut Butter Spread at ALDI and save $0.33 (17%) compared with Great Value Creamy Peanut Butter.");
  });

  it("falls back to the template when the AI is unavailable (offline, no key, timeout)", async () => {
    generate.mockRejectedValue(new AiUnavailableError("timeout", "slow"));
    const result = await explainSwap(swap, stores, known);
    expect(result).toMatchObject({ source: "template", rejectedReason: "timeout" });
  });
});
