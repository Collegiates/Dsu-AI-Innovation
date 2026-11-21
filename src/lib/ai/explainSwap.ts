import "server-only";
import type { Store } from "@/lib/data/schema";
import { formatMoney } from "@/lib/pricing/money";
import type { Swap } from "@/lib/swaps/findSwaps";
import { AiUnavailableError, generateJson } from "./gemini";
import { SwapExplanationSchema, validateSwapExplanation, type KnownNames, type SwapFacts } from "./validators";

/**
 * Collects the exact facts about a swap that Gemini is allowed to use, all computed by code.
 * Example: { fromName: "Pantene Pro-V Shampoo", toStore: "Walmart", savings: "$3.51", savingsPercent: 55, ... }.
 */
export function swapFacts(swap: Swap, storesById: ReadonlyMap<string, Store>): SwapFacts {
  const storeName = (id: string) => storesById.get(id)?.chain ?? id;
  return {
    fromName: `${swap.from.brand} ${swap.from.name}`,
    fromBrand: swap.from.brand,
    toName: `${swap.to.brand} ${swap.to.name}`,
    toBrand: swap.to.brand,
    fromStore: storeName(swap.from.storeId),
    toStore: storeName(swap.to.storeId),
    fromPrice: formatMoney(swap.fromCents),
    toPrice: formatMoney(swap.toCents),
    savings: formatMoney(swap.savingsCents),
    savingsPercent: swap.savingsPercent,
  };
}

/**
 * The fixed sentence used whenever the AI sentence is unavailable or fails a check. Always correct, because code fills it in.
 * Example: "Switch to Equate Dandruff Shampoo at Walmart and save $3.51 (55%) compared with Pantene Pro-V Shampoo."
 */
export function templateExplanation(f: SwapFacts): string {
  return `Switch to ${f.toName} at ${f.toStore} and save ${f.savings} (${f.savingsPercent}%) compared with ${f.fromName}.`;
}

/** Builds the prompt. Only catalog facts go in, inside clear markers, and never anything the shopper typed. */
export function explanationPrompt(f: SwapFacts): string {
  return [
    "You write one short, friendly sentence for a grocery savings app explaining why a cheaper swap is worth trying.",
    "Use ONLY the facts between <facts> and </facts>. Do not add any other prices, percentages, products, brands or stores.",
    `If you mention money, use exactly the amounts given. Keep it under 25 words. Reply as JSON: {"sentence": "..."}.`,
    `<facts>${JSON.stringify(f)}</facts>`,
  ].join("\n");
}

/** Where an explanation came from: Gemini (after passing every check) or the fixed template. */
export type Explanation = { text: string; source: "ai" | "template"; rejectedReason?: string };

const cache = new Map<string, Explanation>();

/**
 * Gets a one-sentence explanation for a swap. Gemini writes it from the code-computed facts; the validator then checks
 * every amount, percentage, name and the length. If Gemini is unavailable or the sentence fails, the template is used.
 * Results are cached by swap id, so the same swap is explained once. Example: explainSwap(swap, stores, names).
 */
export async function explainSwap(swap: Swap, storesById: ReadonlyMap<string, Store>, known: KnownNames): Promise<Explanation> {
  const cached = cache.get(swap.id);
  if (cached) return cached;

  const facts = swapFacts(swap, storesById);
  let result: Explanation;
  try {
    const { sentence } = await generateJson(explanationPrompt(facts), SwapExplanationSchema, { fixtureKey: `swap:${swap.id}` });
    const check = validateSwapExplanation(sentence, facts, known);
    result = check.ok
      ? { text: sentence.trim(), source: "ai" }
      : { text: templateExplanation(facts), source: "template", rejectedReason: check.reason };
  } catch (error) {
    const reason = error instanceof AiUnavailableError ? error.reason : "unexpected-error";
    console.warn(`[swaps] template explanation for ${swap.id}: ${reason}`);
    // Not cached: Gemini may be back for the next request.
    return { text: templateExplanation(facts), source: "template", rejectedReason: reason };
  }
  if (result.rejectedReason) console.warn(`[swaps] template explanation for ${swap.id}: ${result.rejectedReason}`);
  cache.set(swap.id, result);
  return result;
}

/** Empties the explanation cache. Used by tests so one test's answer doesn't leak into the next. */
export function clearExplanationCache(): void {
  cache.clear();
}
