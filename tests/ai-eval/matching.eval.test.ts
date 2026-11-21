import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { embedTexts, fixtureKey, QueryEmbeddingsFixtureSchema } from "@/lib/ai/gemini";
import { matchWithEmbeddings, matchWithKeywords, type MatchResult } from "@/lib/matching/core";
import { loadProductEmbeddings } from "@/lib/matching/embeddings";
import { evalCatalog, goldenCases, type GoldenCase } from "./catalog";

const MIN_ACCURACY = 0.9;

/** A case is right when the app finds an accepted product group, or answers "No match" when none should be found. */
function isCorrect(c: GoldenCase, r: MatchResult): boolean {
  if (c.expected === null) return r.label === "No match";
  return r.label !== "No match" && r.groupKey !== null && [c.expected, ...(c.acceptable ?? [])].includes(r.groupKey);
}

/**
 * Picks how to run: live Gemini embeddings with EVAL_LIVE=true, saved embeddings when every golden input has one,
 * otherwise the keyword fallback (what the app does with no key or no internet).
 */
async function queryVectors(inputs: string[]): Promise<{ mode: string; vectors: number[][] | null }> {
  const products = loadProductEmbeddings();
  if (process.env.EVAL_LIVE === "true") {
    if (!products) throw new Error("EVAL_LIVE needs data/embeddings.json. Run npm run build-embeddings first.");
    return { mode: "live", vectors: await embedTexts(inputs, "query") };
  }
  const fixturePath = "data/fixtures/query-embeddings.json";
  if (products && existsSync(fixturePath)) {
    const fixture = QueryEmbeddingsFixtureSchema.parse(JSON.parse(readFileSync(fixturePath, "utf8")));
    if (inputs.every((t) => fixture.vectors[fixtureKey(t)])) {
      return { mode: "cached-embeddings", vectors: inputs.map((t) => fixture.vectors[fixtureKey(t)]) };
    }
  }
  return { mode: "keywords", vectors: null };
}

it(`matches messy list text to the right product group at least ${MIN_ACCURACY * 100}% of the time`, async () => {
  const { products, source } = evalCatalog();
  const cases = goldenCases();
  const { mode, vectors } = await queryVectors(cases.map((c) => c.input));
  const productVectors = loadProductEmbeddings();

  const rows = cases.map((c, i) => {
    const result = vectors && productVectors ? matchWithEmbeddings(c.input, vectors[i], productVectors, products) : matchWithKeywords(c.input, products);
    return { input: c.input, expected: c.expected ?? "(No match)", got: result.groupKey ?? "(No match)", label: result.label, score: Number(result.score.toFixed(2)), correct: isCorrect(c, result) };
  });
  const correct = rows.filter((r) => r.correct).length;
  const accuracy = correct / rows.length;

  console.log(`\nAI eval: matching (${mode}, catalog: ${source}, ${products.length} products)`);
  console.table(rows);
  console.log(`Accuracy: ${(accuracy * 100).toFixed(1)}% (${correct}/${rows.length}), minimum ${MIN_ACCURACY * 100}%\n`);
  writeFileSync(
    "tests/ai-eval/latest-result.json",
    JSON.stringify({ accuracy, correct, total: rows.length, mode, runAt: new Date().toISOString(), misses: rows.filter((r) => !r.correct) }, null, 2) + "\n",
  );

  expect(products.length).toBeGreaterThan(0);
  expect(accuracy).toBeGreaterThanOrEqual(MIN_ACCURACY);
});
