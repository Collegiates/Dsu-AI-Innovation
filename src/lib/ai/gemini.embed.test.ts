import { afterEach, beforeEach, expect, it, vi } from "vitest";

// Behaves like gemini-embedding-2: a list of several texts comes back as ONE combined embedding,
// while a single text comes back as one embedding for that text.
const embedContent = vi.fn(async ({ contents }: { contents: string | string[] }) => {
  const list = Array.isArray(contents) ? contents : [contents];
  return list.length === 1 ? { embeddings: [{ values: [list[0].length, 1] }] } : { embeddings: [{ values: [999, 999] }] };
});

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { embedContent };
  },
}));

beforeEach(() => {
  vi.resetModules(); // each test gets a fresh, empty per-minute Gemini counter
  vi.stubEnv("DEMO_MODE", "false");
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("GEMINI_EMBED_MODEL", "gemini-embedding-2");
});

afterEach(() => {
  vi.unstubAllEnvs();
  embedContent.mockClear();
});

it("regression: gemini-embedding-2 merges a batch into one vector, so each text is embedded on its own", async () => {
  const { embedTexts } = await import("./gemini");
  const vectors = await embedTexts(["milk", "eggs", "bananas"], "document");
  expect(vectors).toEqual([
    [4, 1],
    [4, 1],
    [7, 1],
  ]);
  expect(embedContent).toHaveBeenCalledTimes(3);
});

it("returns no vectors for an empty list without calling Gemini", async () => {
  const { embedTexts } = await import("./gemini");
  await expect(embedTexts([])).resolves.toEqual([]);
  expect(embedContent).not.toHaveBeenCalled();
});

it("fails with a generic AI-unavailable error when one text comes back empty", async () => {
  embedContent.mockResolvedValueOnce({ embeddings: [] });
  const { embedTexts, AiUnavailableError } = await import("./gemini");
  await expect(embedTexts(["milk"])).rejects.toBeInstanceOf(AiUnavailableError);
});

it("regression: a list bigger than the per-minute Gemini limit falls back with 'rate-limited' instead of going over it", async () => {
  const { embedTexts, AiUnavailableError } = await import("./gemini");
  const { aiConfig } = await import("@/lib/config/app");
  const tooMany = Array.from({ length: aiConfig.embedRequestsPerMinute + 5 }, (_, i) => `item ${i}`);
  const error = await embedTexts(tooMany, "query", { maxQuotaWaitMs: 0 }).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AiUnavailableError);
  expect((error as InstanceType<typeof AiUnavailableError>).reason).toBe("rate-limited");
  expect(embedContent.mock.calls.length).toBeLessThanOrEqual(aiConfig.embedRequestsPerMinute);
});

it("regression: a temporary 'quota exceeded' (429) answer is retried instead of failing the whole batch", async () => {
  embedContent.mockRejectedValueOnce(Object.assign(new Error("quota"), { status: 429 }));
  const { embedTexts } = await import("./gemini");
  vi.useFakeTimers();
  const pending = embedTexts(["milk"], "document");
  await vi.advanceTimersByTimeAsync(60_000);
  await expect(pending).resolves.toEqual([[4, 1]]);
  vi.useRealTimers();
  expect(embedContent).toHaveBeenCalledTimes(2);
});
