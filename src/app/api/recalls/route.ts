import { clientKey, createRateLimiter } from "@/lib/ai/rate-limit";
import { GENERIC_ERRORS, json, readBody } from "@/lib/api/http";
import { RecallsRequestSchema } from "@/lib/api/schemas";
import { inputLimits } from "@/lib/config/app";
import { loadCatalog } from "@/lib/data/load";
import { matchRecalls, RECALL_LABEL } from "@/lib/recalls/match";
import { fetchRecalls } from "@/lib/recalls/openfda";

const rateLimit = createRateLimiter({ limit: inputLimits.aiRequestsPerMinute, windowMs: 60_000 });

/**
 * POST /api/recalls: checks the products on the list against recent FDA food recalls.
 * Example request: { "productIds": ["walmart-dover--great-value--2-reduced-fat-milk"] }.
 * Returns possible matches (always labeled "check the lot code"), and whether live or saved recall data was used.
 */
export async function POST(request: Request): Promise<Response> {
  const limit = rateLimit(clientKey(request));
  if (!limit.ok) return json({ error: GENERIC_ERRORS.tooMany }, 429, { "Retry-After": String(limit.retryAfterSeconds) });

  const body = await readBody(request, RecallsRequestSchema);
  if (!body.ok) return body.response;
  try {
    const { productsById } = loadCatalog();
    const products = body.data.productIds.flatMap((id) => productsById.get(id) ?? []);
    const { recalls, source } = await fetchRecalls();
    return json({ source, checked: recalls.length, label: RECALL_LABEL, matches: matchRecalls(products, recalls) });
  } catch (error) {
    console.error("[api/recalls] failed", error);
    return json({ error: GENERIC_ERRORS.server }, 500);
  }
}
