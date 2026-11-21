import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

/** The saved product embeddings file (data/embeddings.json), written by scripts/build-embeddings.ts. */
export const ProductEmbeddingsSchema = z.object({
  model: z.string().min(1),
  createdAt: z.string(),
  items: z.array(z.object({ productId: z.string(), text: z.string(), vector: z.array(z.number()).min(1) })),
});
export type ProductEmbeddings = z.infer<typeof ProductEmbeddingsSchema>;

/**
 * Reads the saved product embeddings, or returns null if they are missing or damaged (the app then matches by keywords).
 * Example: before "npm run build-embeddings" has run, this returns null.
 */
export function loadProductEmbeddings(root = process.cwd()): Map<string, number[]> | null {
  try {
    const parsed = ProductEmbeddingsSchema.safeParse(JSON.parse(readFileSync(join(root, "data", "embeddings.json"), "utf8")));
    if (!parsed.success) return null;
    return new Map(parsed.data.items.map((i) => [i.productId, i.vector]));
  } catch {
    return null;
  }
}
