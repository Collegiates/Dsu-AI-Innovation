/**
 * Pre-computes embeddings (lists of numbers that capture meaning) so matching is fast and works offline.
 * Writes data/embeddings.json for every catalog product, embedded as "brand name size variant category", and
 * data/fixtures/query-embeddings.json for the demo list and the AI eval inputs, so the demo works with no internet.
 * Needs GEMINI_API_KEY and GEMINI_EMBED_MODEL in .env.local, and DEMO_MODE not "true". Example: npm run build-embeddings
 */
import { writeFileSync } from "node:fs";
import { aiMode, embedTexts, fixtureKey } from "../src/lib/ai/gemini";
import { DEMO_LIST } from "../src/lib/config/demo";
import { evalCatalog, goldenCases } from "../tests/ai-eval/catalog";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: the check below explains what is missing.
}

async function main() {
  const mode = aiMode();
  if (!mode.live) {
    console.error(`Can't build embeddings: ${mode.reason === "no-key" ? "GEMINI_API_KEY is missing from .env.local" : "DEMO_MODE is true"}.`);
    process.exit(1);
  }
  const { products, source } = evalCatalog();
  const texts = products.map((p) => `${p.brand} ${p.name} ${p.sizeValue} ${p.sizeUnit.replace("_", " ")} ${p.variant} ${p.category.replace("_", " ")}`);

  // Gemini accepts a limited number of texts per request, so send them in batches.
  const batch = async (items: string[], purpose: "query" | "document") => {
    const out: number[][] = [];
    for (let i = 0; i < items.length; i += 50) out.push(...(await embedTexts(items.slice(i, i + 50), purpose)));
    return out;
  };

  const productVectors = await batch(texts, "document");
  const model = process.env.GEMINI_EMBED_MODEL!;
  writeFileSync(
    "data/embeddings.json",
    JSON.stringify({ model, createdAt: new Date().toISOString(), items: products.map((p, i) => ({ productId: p.id, text: texts[i], vector: productVectors[i] })) }) + "\n",
  );

  const queries = [...new Set([...DEMO_LIST, ...goldenCases().map((c) => c.input)].map(fixtureKey))];
  const queryVectors = await batch(queries, "query");
  writeFileSync(
    "data/fixtures/query-embeddings.json",
    JSON.stringify({ model, vectors: Object.fromEntries(queries.map((q, i) => [q, queryVectors[i]])) }) + "\n",
  );
  console.log(`Embedded ${products.length} products (from ${source}) and ${queries.length} list inputs with ${model}.`);
}

main().catch((error) => {
  console.error("Building embeddings failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
