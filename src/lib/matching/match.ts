import "server-only";
import { AiUnavailableError, embedTexts } from "@/lib/ai/gemini";
import type { Product } from "@/lib/data/schema";
import { matchWithEmbeddings, matchWithKeywords, type MatchResult } from "./core";
import { loadProductEmbeddings } from "./embeddings";

/**
 * Matches every line of the shopper's list to catalog products.
 * Uses embeddings when saved product embeddings exist and the typed text can be embedded (live Gemini or saved fixture);
 * otherwise falls back to keyword matching for the whole list, and logs why.
 * The typed text is only ever compared as data. It is never put into an AI prompt as instructions.
 * Example: matchList(["2 gal milk", "lawn mower"], products) → [Same product (milk), No match].
 */
export async function matchList(items: string[], catalog: readonly Product[]): Promise<MatchResult[]> {
  const saved = loadProductEmbeddings();
  // Saved embeddings from an older catalog would silently hide every product they don't cover,
  // so they are only used when they cover the whole catalog. Fix: npm run build-embeddings.
  const productVectors = saved && catalog.every((p) => saved.has(p.id)) ? saved : null;
  if (saved && !productVectors) console.warn("[matching] using keyword fallback: embeddings-stale");
  let queryVectors: number[][] | null = null;
  if (productVectors) {
    try {
      queryVectors = await embedTexts(items, "query");
    } catch (error) {
      const reason = error instanceof AiUnavailableError ? error.reason : "unexpected-error";
      console.warn(`[matching] using keyword fallback: ${reason}`);
    }
  }
  return items.map((text, i) =>
    queryVectors && productVectors ? matchWithEmbeddings(text, queryVectors[i], productVectors, catalog) : matchWithKeywords(text, catalog),
  );
}
