import { beforeEach, expect, it, vi } from "vitest";
import { makeProduct } from "@/lib/trip/test-fixtures";

const embedTexts = vi.fn(async (texts: string[]) => texts.map(() => [1, 0]));
const loadProductEmbeddings = vi.fn((): Map<string, number[]> | null => null);
vi.mock("@/lib/ai/gemini", async (original) => ({ ...(await original<object>()), embedTexts: (t: string[]) => embedTexts(t) }));
vi.mock("./embeddings", () => ({ loadProductEmbeddings: () => loadProductEmbeddings() }));

const catalog = [
  makeProduct("walmart-dover", "Creamy Peanut Butter", 1.98, { brand: "Great Value", groupKey: "peanut-butter-creamy", variant: "creamy" }),
  makeProduct("aldi-dover", "Creamy Peanut Butter", 1.65, { brand: "Peanut Delight", groupKey: "peanut-butter-creamy", variant: "creamy" }),
];

beforeEach(() => {
  embedTexts.mockClear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

it("matches by embeddings when every catalog product has a saved embedding", async () => {
  loadProductEmbeddings.mockReturnValue(new Map(catalog.map((p) => [p.id, [1, 0]])));
  const { matchList } = await import("./match");
  const [result] = await matchList(["creamy peanut butter"], catalog);
  expect(result.groupKey).toBe("peanut-butter-creamy");
  expect(embedTexts).toHaveBeenCalledOnce();
});

it("regression: stale saved embeddings that don't cover the catalog fall back to keywords instead of 'No match' for everything", async () => {
  loadProductEmbeddings.mockReturnValue(new Map([["some-other-product", [1, 0]]]));
  const { matchList } = await import("./match");
  const [result] = await matchList(["creamy peanut butter"], catalog);
  expect(result.groupKey).toBe("peanut-butter-creamy");
  expect(embedTexts).not.toHaveBeenCalled();
});

it("falls back to keywords when there are no saved embeddings", async () => {
  loadProductEmbeddings.mockReturnValue(null);
  const { matchList } = await import("./match");
  const [result] = await matchList(["creamy peanut butter"], catalog);
  expect(result.groupKey).toBe("peanut-butter-creamy");
});
