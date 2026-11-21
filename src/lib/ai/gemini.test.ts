import { describe, expect, it } from "vitest";
import { aiMode, fixtureKey } from "./gemini";

describe("aiMode", () => {
  it("never calls Gemini in demo mode, even with a key", () => {
    expect(aiMode({ DEMO_MODE: "true", GEMINI_API_KEY: "k" })).toEqual({ live: false, reason: "demo-mode" });
  });

  it("falls back when the key is missing", () => {
    expect(aiMode({ DEMO_MODE: "false" })).toEqual({ live: false, reason: "no-key" });
  });

  it("goes live with a key outside demo mode", () => {
    expect(aiMode({ GEMINI_API_KEY: "k" })).toEqual({ live: true });
  });
});

describe("fixtureKey", () => {
  it("saves list text trimmed and in lower case", () => {
    expect(fixtureKey("  2% Milk ")).toBe("2% milk");
  });
});

describe("embedTexts with saved fixtures", () => {
  it("regression: list text like 'constructor' or '__proto__' is not found in the saved embeddings", async () => {
    const { mkdtempSync, mkdirSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { vi } = await import("vitest");
    const { embedTexts, AiUnavailableError } = await import("./gemini");

    const root = mkdtempSync(join(tmpdir(), "fixtures-"));
    mkdirSync(join(root, "data", "fixtures"), { recursive: true });
    writeFileSync(join(root, "data", "fixtures", "query-embeddings.json"), JSON.stringify({ model: "m", vectors: { milk: [1, 0] } }));
    vi.spyOn(process, "cwd").mockReturnValue(root);
    vi.stubEnv("DEMO_MODE", "true");

    await expect(embedTexts(["milk"])).resolves.toEqual([[1, 0]]);
    for (const text of ["constructor", "__proto__", "toString"]) {
      await expect(embedTexts([text])).rejects.toBeInstanceOf(AiUnavailableError);
    }
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
});
