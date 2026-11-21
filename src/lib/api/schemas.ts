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


/** What POST /api/recalls accepts: the product ids on the current list (up to 100). */
export const RecallsRequestSchema = z.object({ productIds: z.array(id).max(inputLimits.maxListItems) }).strict();
