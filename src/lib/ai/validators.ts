import { z } from "zod";
import { aiConfig } from "@/lib/config/app";
import { toCents } from "@/lib/pricing/money";

/** The JSON shape Gemini must return for a swap explanation. Anything else is rejected before it is read. */
export const SwapExplanationSchema = z.object({ sentence: z.string().min(1).max(400) }).strict();

/**
 * The only facts Gemini is given when explaining a swap. All numbers here were computed by code.
 * Example: { fromName: "Great Value Creamy Peanut Butter", savings: "$0.46", savingsPercent: 23, ... }.
 */
export type SwapFacts = {
  fromName: string;
  fromBrand: string;
  toName: string;
  toBrand: string;
  fromStore: string;
  toStore: string;
  fromPrice: string;
  toPrice: string;
  savings: string;
  savingsPercent: number;
};

/** Names the explanation must not mention unless they are part of the facts: every catalog brand and store chain. */
export type KnownNames = { brands: readonly string[]; stores: readonly string[] };

// Store chains people commonly mention, so an AI sentence can't invent "cheaper at Kroger".
const OTHER_CHAINS = ["kroger", "target", "giant", "food lion", "safeway", "costco", "acme", "weis", "wegmans", "whole foods", "trader joe", "lidl", "publix", "sam's club"];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mentions = (text: string, name: string) => new RegExp(`(^|[^a-z0-9])${escape(name.toLowerCase())}([^a-z0-9]|$)`).test(text);

/**
 * Checks a Gemini-written swap sentence before anyone sees it. It is rejected if it:
 * is longer than 25 words, contains any dollar amount or percentage that code didn't compute, names a brand or store
 * that isn't in the facts, or contains HTML. Example: "Save $5.00" when the real saving is $0.46 → rejected.
 * Returns ok, or the reason it failed so the reason can be logged and a template sentence used instead.
 */
export function validateSwapExplanation(text: string, facts: SwapFacts, known: KnownNames): { ok: true } | { ok: false; reason: string } {
  const sentence = text.trim();
  if (sentence.length === 0) return { ok: false, reason: "empty" };
  if (/[<>]/.test(sentence)) return { ok: false, reason: "contains HTML" };

  const words = sentence.split(/\s+/).length;
  if (words > aiConfig.maxExplanationWords) return { ok: false, reason: `too long (${words} words)` };

  // Every money amount must be one of the prices or the saving that code computed.
  const allowedCents = new Set([facts.fromPrice, facts.toPrice, facts.savings].map((s) => toCents(Number(s.replace(/[$,]/g, "")))));
  const amounts: number[] = [];
  for (const m of sentence.matchAll(/\$\s?(\d[\d,]*(?:\.\d+)?)/g)) amounts.push(toCents(Number(m[1].replace(/,/g, ""))));
  for (const m of sentence.matchAll(/(\d[\d,]*(?:\.\d+)?)\s?dollars?\b/gi)) amounts.push(toCents(Number(m[1].replace(/,/g, ""))));
  for (const m of sentence.matchAll(/(\d+)\s?(?:cents?|¢)/gi)) amounts.push(Number(m[1]));
  const badAmount = amounts.find((c) => !allowedCents.has(c));
  if (badAmount !== undefined) return { ok: false, reason: `amount $${(badAmount / 100).toFixed(2)} not in the facts` };

  for (const m of sentence.matchAll(/(\d+(?:\.\d+)?)\s?(?:%|percent\b)/gi)) {
    if (Number(m[1]) !== facts.savingsPercent) return { ok: false, reason: `percentage ${m[1]}% not in the facts` };
  }

  const lower = sentence.toLowerCase();
  const allowedNames = [facts.fromBrand, facts.toBrand, facts.fromStore, facts.toStore].map((s) => s.toLowerCase());
  const isAllowed = (name: string) => allowedNames.some((a) => a.includes(name) || name.includes(a));
  for (const name of [...known.brands, ...known.stores, ...OTHER_CHAINS]) {
    const n = name.toLowerCase();
    if (n.length >= 3 && !isAllowed(n) && mentions(lower, n)) return { ok: false, reason: `mentions "${name}", which is not in the facts` };
  }
  return { ok: true };
}
