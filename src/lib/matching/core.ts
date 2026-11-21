import { aiConfig } from "@/lib/config/app";
import type { Product } from "@/lib/data/schema";
import { unitPrice } from "@/lib/pricing/price";
import { compatibleAlternatives } from "@/lib/trip/basket";
import { tokens, wordMatch } from "./text";

/** How sure the app is about a match. "Similar" means "close, but check it"; "No match" means nothing fits. */
export type MatchLabel = "Same product" | "Similar" | "No match";

/** One catalog product with a closeness score from 0 to 1. */
export type Candidate = { product: Product; score: number };

/**
 * The answer for one line of the shopper's list.
 * Example: "2 gal milk" → label "Same product", groupKey "milk-2pct-1gal", options = the 2% gallons, cheapest per fl oz first.
 */
export type MatchResult = {
  input: string;
  label: MatchLabel;
  method: "embeddings" | "keywords";
  score: number;
  groupKey: string | null;
  /** The closest product found. */
  best: Product | null;
  /** All interchangeable products (same group and variant), cheapest per unit first. */
  options: Product[];
  /** Other close products of a different variant, offered for the shopper to choose, never merged in. */
  otherVariants: { groupKey: string; variant: string; product: Product; score: number }[];
};

const noMatch = (input: string, method: MatchResult["method"], score = 0): MatchResult => ({
  input,
  label: "No match",
  method,
  score,
  groupKey: null,
  best: null,
  options: [],
  otherVariants: [],
});

/**
 * Turns ranked candidates into a match: code keeps only products in the top candidate's category, separates
 * variants (never merging e.g. vanilla and plain yogurt), and sorts interchangeable products by unit price.
 * Example: top candidate "Nonfat Plain Greek Yogurt" → options are plain nonfat Greek yogurts from every store.
 */
export function buildResult(input: string, ranked: Candidate[], catalog: readonly Product[], method: MatchResult["method"], label: MatchLabel): MatchResult {
  const top = ranked[0];
  if (!top || label === "No match") return noMatch(input, method, top?.score ?? 0);

  const sameCategory = ranked.filter((c) => c.product.category === top.product.category);
  const options = compatibleAlternatives(top.product, catalog).sort(
    (a, b) => (unitPrice(a) ?? Infinity) - (unitPrice(b) ?? Infinity) || a.id.localeCompare(b.id),
  );
  const seen = new Set([`${top.product.groupKey}|${top.product.variant.toLowerCase()}`]);
  const otherVariants: MatchResult["otherVariants"] = [];
  for (const c of sameCategory) {
    const key = `${c.product.groupKey}|${c.product.variant.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    otherVariants.push({ groupKey: c.product.groupKey, variant: c.product.variant, product: c.product, score: c.score });
  }
  return { input, label, method, score: top.score, groupKey: top.product.groupKey, best: top.product, options, otherVariants };
}

// Ranks candidates: higher score first, then product id so the order never varies.
const byScore = (a: Candidate, b: Candidate) => b.score - a.score || a.product.id.localeCompare(b.product.id);

/** The words used to recognize a product: brand, name, variant and category. */
export const productText = (p: Product) => `${p.brand} ${p.name} ${p.variant} ${p.category.replace(/_/g, " ")}`;

/**
 * Matches list text to products by comparing words, used when embeddings aren't available (no key, no saved data).
 * The score is the share of typed words found in the product (allowing small typos). Ties go to the product whose
 * name has the fewest extra words, i.e. the plainest version. Example: "eggs dozen" → "Grade A Large Eggs".
 */
export function matchWithKeywords(input: string, catalog: readonly Product[]): MatchResult {
  const typed = tokens(input);
  if (typed.length === 0) return noMatch(input, "keywords");

  const scored = catalog.map((product) => {
    const words = new Set(tokens(productText(product)));
    const nameWords = tokens(`${product.name}`);
    const perWord = typed.map((t) => Math.max(0, ...[...words].map((w) => wordMatch(t, w))));
    const coverage = perWord.reduce((a, b) => a + b, 0) / typed.length;
    const nameHits = nameWords.filter((w) => typed.some((t) => wordMatch(t, w) > 0)).length;
    const precision = nameWords.length > 0 ? nameHits / nameWords.length : 0;
    return { product, score: coverage, precision, exact: perWord.every((s) => s >= 0.9) };
  });
  scored.sort((a, b) => b.score - a.score || b.precision - a.precision || a.product.id.localeCompare(b.product.id));

  const top = scored[0];
  if (!top || top.score < aiConfig.keywordMatchThreshold) return noMatch(input, "keywords", top?.score ?? 0);
  // A vague input (e.g. "bread") that fits several different products equally well is only "Similar".
  const tied = scored.some(
    (s) => s.product.groupKey !== top.product.groupKey && Math.abs(s.score - top.score) < 1e-9 && Math.abs(s.precision - top.precision) < 1e-9,
  );
  const label: MatchLabel = top.score >= 0.999 && top.exact && !tied ? "Same product" : "Similar";
  const ranked = scored.filter((s) => s.score >= aiConfig.keywordMatchThreshold).map(({ product, score }) => ({ product, score }));
  return buildResult(input, ranked, catalog, "keywords", label);
}

/**
 * How alike two embeddings are, from -1 to 1 (1 = same meaning). This is "cosine similarity".
 * Example: cosine([1, 0], [1, 0]) → 1; cosine([1, 0], [0, 1]) → 0.
 */
export function cosine(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

/**
 * Matches list text using embeddings: finds the 5 closest catalog products by meaning, then code labels the match
 * by how close the best one is ("Same product" at or above the threshold, "Similar" below it) and filters the rest.
 * Example: "the cheap bread" lands near the bread products even though no product is called "cheap bread".
 */
export function matchWithEmbeddings(
  input: string,
  queryVector: readonly number[],
  productVectors: ReadonlyMap<string, readonly number[]>,
  catalog: readonly Product[],
): MatchResult {
  const ranked = catalog
    .filter((p) => productVectors.has(p.id))
    .map((product) => ({ product, score: cosine(queryVector, productVectors.get(product.id)!) }))
    .sort(byScore)
    .slice(0, aiConfig.topCandidates);
  const score = ranked[0]?.score ?? 0;
  const label: MatchLabel =
    score >= aiConfig.sameProductThreshold ? "Same product" : score >= aiConfig.similarThreshold ? "Similar" : "No match";
  return buildResult(input, ranked, catalog, "embeddings", label);
}
