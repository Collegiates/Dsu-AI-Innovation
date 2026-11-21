import { z } from "zod";

/** One openFDA food recall record, with only the fields the app uses. Records missing these are ignored. */
const RecallRecordSchema = z.object({
  recall_number: z.string().min(1),
  reason_for_recall: z.string().min(1),
  classification: z.string().min(1),
  report_date: z.string().regex(/^\d{8}$/),
  recalling_firm: z.string().min(1),
  product_description: z.string().min(1),
  status: z.string().optional(),
  code_info: z.string().optional(),
});

/**
 * A food recall in the app's own shape.
 * Example: { recallNumber: "H-0167-2027", classification: "Class II", date: "2026-10-28", firm: "Pacific Coast Producers", ... }.
 */
export type Recall = {
  recallNumber: string;
  reason: string;
  classification: string;
  date: string;
  firm: string;
  productDescription: string;
  status?: string;
  codeInfo?: string;
};

/**
 * Checks an openFDA response and keeps only well-formed recall records, counting the ones it had to skip.
 * A response without a "results" list is treated as empty. Example: 1,000 records with 1 broken → 999 recalls, 1 ignored.
 */
export function parseRecalls(raw: unknown): { recalls: Recall[]; ignored: number } {
  const results = z.object({ results: z.array(z.unknown()) }).safeParse(raw);
  if (!results.success) return { recalls: [], ignored: 0 };
  const recalls: Recall[] = [];
  let ignored = 0;
  for (const record of results.data.results) {
    const r = RecallRecordSchema.safeParse(record);
    if (!r.success) {
      ignored++;
      continue;
    }
    const d = r.data.report_date;
    recalls.push({
      recallNumber: r.data.recall_number,
      reason: r.data.reason_for_recall,
      classification: r.data.classification,
      date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
      firm: r.data.recalling_firm,
      productDescription: r.data.product_description,
      status: r.data.status,
      codeInfo: r.data.code_info,
    });
  }
  return { recalls, ignored };
}
