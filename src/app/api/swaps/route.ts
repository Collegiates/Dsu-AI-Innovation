import { explainSwap } from "@/lib/ai/explainSwap";
import { clientKey, createRateLimiter } from "@/lib/ai/rate-limit";
import { GENERIC_ERRORS, json, readBody } from "@/lib/api/http";
import { SwapsRequestSchema } from "@/lib/api/schemas";
import { inputLimits } from "@/lib/config/app";
import { loadCatalog } from "@/lib/data/load";
import { findSwaps } from "@/lib/swaps/findSwaps";

const rateLimit = createRateLimiter({ limit: inputLimits.aiRequestsPerMinute, windowMs: 60_000 });

/**
 * POST /api/swaps: suggests cheaper similar products for the list, each with a one-sentence explanation.
 * Savings are computed by code; the sentence is AI-written only if it passes every check, otherwise a template.
 * Example request: { "basket": [{ "usualProductId": "walmart-dover--great-value--creamy-peanut-butter" }], "hiddenBrands": [] }.
 */
export async function POST(request: Request): Promise<Response> {
  const limit = rateLimit(clientKey(request));
  if (!limit.ok) return json({ error: GENERIC_ERRORS.tooMany }, 429, { "Retry-After": String(limit.retryAfterSeconds) });

  const body = await readBody(request, SwapsRequestSchema);
  if (!body.ok) return body.response;
  try {
    const { products, stores } = loadCatalog();
    const storesById = new Map(stores.map((s) => [s.id, s]));
    const known = { brands: [...new Set(products.map((p) => p.brand))], stores: stores.flatMap((s) => [s.chain, s.name]) };
    const swaps = findSwaps({ products, ...body.data });
    const explained = await Promise.all(swaps.map(async (swap) => ({ ...swap, explanation: await explainSwap(swap, storesById, known) })));
    return json({ swaps: explained });
  } catch (error) {
    console.error("[api/swaps] failed", error);
    return json({ error: GENERIC_ERRORS.server }, 500);
  }
}
