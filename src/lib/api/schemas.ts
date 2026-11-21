import { z } from "zod";
import { inputLimits } from "@/lib/config/app";
import { SizeUnitSchema } from "@/lib/data/schema";

/** What POST /api/match accepts: 1 to 100 list items, each 1 to 100 characters. Nothing else is allowed. */
export const MatchRequestSchema = z
  .object({ items: z.array(z.string().trim().min(1).max(inputLimits.maxItemChars)).min(1).max(inputLimits.maxListItems) })
  .strict();

const id = z.string().trim().min(1).max(200);
const name = z.string().trim().min(1).max(inputLimits.maxItemChars);

/** What POST /api/swaps accepts: up to 100 list lines, plus up to 100 hidden brands and 100 hidden products. */
export const SwapsRequestSchema = z
  .object({
    basket: z
      .array(
        z
          .object({ usualProductId: id, amount: z.object({ value: z.number().positive().max(10_000), unit: SizeUnitSchema }).strict().optional() })
          .strict(),
      )
      .max(inputLimits.maxListItems),
    hiddenBrands: z.array(name).max(inputLimits.maxListItems).default([]),
    hiddenProducts: z.array(id).max(inputLimits.maxListItems).default([]),
  })
  .strict();


/** The largest receipt photo accepted, as base64 text (about 4 MB of image). */
export const MAX_RECEIPT_IMAGE_CHARS = 5_600_000;

/**
 * What POST /api/receipt accepts: either receipt text (up to 10,000 characters) or one receipt photo or PDF as base64.
 * Example: { "kind": "text", "text": "GV 2% MILK 3.46" } or { "kind": "image", "mimeType": "image/jpeg", "data": "..." }.
 */
export const ReceiptRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: z.string().max(10_000) }).strict(),
  z
    .object({
      kind: z.literal("image"),
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]),
      data: z.string().max(MAX_RECEIPT_IMAGE_CHARS).regex(/^[A-Za-z0-9+/=]*$/),
    })
    .strict(),
]);

/** What POST /api/recalls accepts: the product ids on the current list (up to 100). */
export const RecallsRequestSchema = z.object({ productIds: z.array(id).max(inputLimits.maxListItems) }).strict();
