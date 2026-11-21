import type { Product } from "@/lib/data/schema";
import { tokens } from "@/lib/matching/text";
import type { Recall } from "./schema";

/** The only way a recall match is ever shown: as a possibility the shopper must check, never as certain. */
export const RECALL_LABEL = "Possible match — check the lot code on your package";

// Describing words that appear on many unrelated products, so they never count as the "product word" on their own.
// Example: "Fat" in "Fat Free Cottage Cheese" must not flag "2% Reduced Fat Milk".
const GENERIC_WORDS = new Set([
  "fat", "reduced", "free", "low", "lowfat", "nonfat", "fresh", "frozen", "organic", "natural", "original", "classic",
  "premium", "grade", "large", "small", "white", "brown", "plain", "whole", "everyday", "ultra", "strong", "double",
  "triple", "roll", "pack", "style", "flavored", "flavor", "fruit", "mix", "blend", "breakfast", "deep", "clean",
  "striped", "high", "efficiency", "essential", "pro", "gentle", "boneless", "skinless", "split", "top", "long", "enriched",
  "crispy", "no", "stir", "spread", "creamy", "ground", "liquid", "laundry", "in", "on",
]);

/**
 * The words in a product's name that say what the product is, without the brand, sizes, or describing words.
 * Example: "2% Reduced Fat Milk" → ["milk"]; "Frozen Berry Medley" → ["berry", "medley"].
 */
export function keyWords(product: Pick<Product, "name" | "brand">): string[] {
  const brandWords = new Set(tokens(product.brand));
  return [...new Set(tokens(product.name))].filter((w) => w.length >= 3 && !GENERIC_WORDS.has(w) && !brandWords.has(w) && !/\d/.test(w));
}

// Lower-case, apostrophes dropped, everything else that isn't a letter or digit becomes a space, padded for whole-phrase search.
const normalize = (s: string) => ` ${s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim()} `;

/** One list product that may be affected by a recall, with the recall's details. */
export type RecallMatch = {
  productId: string;
  productName: string;
  brand: string;
  recallNumber: string;
  reason: string;
  classification: string;
  date: string;
  firm: string;
  status?: string;
  matchedWords: string[];
  label: typeof RECALL_LABEL;
};

/**
 * Flags a list product as a possible recall only when the recall's product description contains the product's brand
 * (as a whole phrase) AND at least one of its key product words (as a whole word). Both are needed, so a brand alone
 * or a common word like "berries" alone never raises an alarm. Newest recalls come first.
 * Example: "Great Value Fruit Cocktail" and recall "Great Value Fruit Cocktail in Fruit Juice..." → possible match.
 */
export function matchRecalls(products: readonly Product[], recalls: readonly Recall[]): RecallMatch[] {
  const prepared = recalls.map((r) => ({ recall: r, text: normalize(r.productDescription), words: new Set(tokens(r.productDescription)) }));
  const matches: RecallMatch[] = [];
  for (const product of products) {
    const brand = normalize(product.brand);
    const words = keyWords(product);
    if (brand.trim() === "" || words.length === 0) continue;
    for (const { recall, text, words: recallWords } of prepared) {
      if (!text.includes(brand)) continue;
      const matchedWords = words.filter((w) => recallWords.has(w));
      if (matchedWords.length === 0) continue;
      matches.push({
        productId: product.id,
        productName: `${product.brand} ${product.name}`,
        brand: product.brand,
        recallNumber: recall.recallNumber,
        reason: recall.reason,
        classification: recall.classification,
        date: recall.date,
        firm: recall.firm,
        status: recall.status,
        matchedWords,
        label: RECALL_LABEL,
      });
    }
  }
  return matches.sort((a, b) => b.date.localeCompare(a.date) || a.recallNumber.localeCompare(b.recallNumber) || a.productId.localeCompare(b.productId));
}
