import "server-only";
import { createHash } from "node:crypto";
import { AiUnavailableError, generateJson } from "@/lib/ai/gemini";
import { clientKey, createRateLimiter } from "@/lib/ai/rate-limit";
import { GENERIC_ERRORS, json, readBody } from "@/lib/api/http";
import { MAX_RECEIPT_IMAGE_CHARS, ReceiptRequestSchema } from "@/lib/api/schemas";
import { inputLimits } from "@/lib/config/app";
import { DEMO_LIST } from "@/lib/config/demo";
import { parseReceiptText, RECEIPT_PROMPT, ReceiptItemsSchema } from "@/lib/receipt/receipt";

const rateLimit = createRateLimiter({ limit: inputLimits.aiRequestsPerMinute, windowMs: 60_000 });

/** Where the returned items came from, so the page can label them honestly. */
type ReceiptSource = "ai" | "text" | "demo-sample";

/**
 * POST /api/receipt: reads the item names from a receipt so they can fill the shopping list.
 * Text receipts are read by plain code; photos and PDFs by Gemini (checked: item names only, no prices).
 * If nothing can be read (an empty receipt, demo mode, no AI key), it returns James's sample receipt and says so,
 * so the demo keeps going without pretending. Example: { "kind": "text", "text": "BANANAS 0.50" } → { source: "text", items: ["BANANAS"] }.
 */
export async function POST(request: Request): Promise<Response> {
  const limit = rateLimit(clientKey(request));
  if (!limit.ok) return json({ error: GENERIC_ERRORS.tooMany }, 429, { "Retry-After": String(limit.retryAfterSeconds) });

  const body = await readBody(request, ReceiptRequestSchema, MAX_RECEIPT_IMAGE_CHARS + 1_000);
  if (!body.ok) return body.response;

  let items: string[] = [];
  let source: ReceiptSource = "text";
  if (body.data.kind === "text") {
    items = parseReceiptText(body.data.text);
  } else {
    source = "ai";
    try {
      const fixtureKey = `receipt:${createHash("sha256").update(body.data.data).digest("hex")}`;
      const image = { mimeType: body.data.mimeType, data: body.data.data };
      items = (await generateJson(RECEIPT_PROMPT, ReceiptItemsSchema, { fixtureKey, image })).items;
    } catch (error) {
      const reason = error instanceof AiUnavailableError ? error.reason : "unexpected";
      console.warn(`[api/receipt] could not read the photo with AI: ${reason}`);
    }
  }

  if (items.length === 0) return json({ source: "demo-sample" satisfies ReceiptSource, items: [...DEMO_LIST] });
  return json({ source, items });
}
