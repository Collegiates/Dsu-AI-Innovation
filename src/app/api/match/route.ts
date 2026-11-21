import { clientKey, createRateLimiter } from "@/lib/ai/rate-limit";
import { GENERIC_ERRORS, json, readBody } from "@/lib/api/http";
import { MatchRequestSchema } from "@/lib/api/schemas";
import { inputLimits } from "@/lib/config/app";
import { loadCatalog } from "@/lib/data/load";
import { matchList } from "@/lib/matching/match";

const rateLimit = createRateLimiter({ limit: inputLimits.aiRequestsPerMinute, windowMs: 60_000 });

/**
 * POST /api/match: turns the shopper's typed list into catalog products, with a confidence label per line.
 * Example request: { "items": ["2 gal milk", "eggs dozen"] } → { "results": [{ "label": "Same product", ... }, ...] }.
 * Rejects bad input (400) and too many requests (429), and never shows internal error details.
 */
export async function POST(request: Request): Promise<Response> {
  const limit = rateLimit(clientKey(request));
  if (!limit.ok) return json({ error: GENERIC_ERRORS.tooMany }, 429, { "Retry-After": String(limit.retryAfterSeconds) });

  const body = await readBody(request, MatchRequestSchema);
  if (!body.ok) return body.response;
  try {
    const { products } = loadCatalog();
    return json({ results: await matchList(body.data.items, products) });
  } catch (error) {
    console.error("[api/match] failed", error);
    return json({ error: GENERIC_ERRORS.server }, 500);
  }
}
