// Words that say nothing about which product is meant, plus size words (sizes are compared by code, not by matching).
const STOPWORDS = new Set([
  "a", "an", "the", "of", "for", "and", "or", "with", "some", "any", "my", "i", "is", "to", "please", "need", "get", "buy",
  "cheap", "cheapest", "good", "best", "big", "small", "pack", "bag", "box", "bottle", "jar", "can", "store", "brand",
  "gal", "gallon", "oz", "ounce", "lb", "lbs", "pound", "ct", "count", "fl", "dozen", "half", "x",
]);

const SPELLING = new Map([["yoghurt", "yogurt"]]);

/** Turns a plural word into its singular form for matching. Example: "berries" → "berry", "eggs" → "egg". */
function singular(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.length > 3 && word.endsWith("s") && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

/**
 * Breaks product or list text into the words that identify a product, in a standard form so they can be compared.
 * Removes filler words, quantities and sizes, makes plurals singular, and keeps percentages like "2%" as "2pct".
 * Example: "2 gal of the cheap Bananas" → ["banana"]; "2% milk" → ["2pct", "milk"].
 */
export function tokens(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/(\d+(?:\.\d+)?)\s*%/g, " $1pct ")
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((w) => SPELLING.get(w) ?? w)
    .map(singular)
    .map((w) => SPELLING.get(w) ?? w);
  // Pure numbers and number-plus-unit ("2", "2lb", "12oz") are quantities, not product words. "2pct" (2%) is kept.
  return words.filter((w) => !STOPWORDS.has(w) && !/^\d+(\.\d+)?(lb|oz|gal|ct|pk|g|kg|ml|l)?$/.test(w));
}

/** How many single-letter edits turn one word into another. Example: "yougurt" → "yogurt" is 1 edit. */
export function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return row[b.length];
}

/**
 * How well one typed word matches one product word, from 0 (not at all) to 1 (exactly).
 * Allows small typos in longer words and shortened words, so "yougurt" still finds "yogurt".
 * Example: wordMatch("spagetti", "spaghetti") → 0.85; wordMatch("lawn", "milk") → 0.
 */
export function wordMatch(typed: string, product: string): number {
  if (typed === product) return 1;
  const shorter = Math.min(typed.length, product.length);
  const longer = Math.max(typed.length, product.length);
  if (shorter >= 4 && shorter / longer >= 0.75 && (product.startsWith(typed) || typed.startsWith(product))) return 0.9;
  if (shorter < 4) return 0;
  const edits = editDistance(typed, product);
  if (edits === 1) return 0.85;
  if (edits === 2 && shorter >= 7) return 0.75;
  return 0;
}
