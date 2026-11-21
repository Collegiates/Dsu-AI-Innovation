import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRecalls, recallsUrl } from "./openfda";

const now = new Date("2026-11-21T12:00:00Z");
const record = {
  recall_number: "H-9999-2027",
  reason_for_recall: "Test reason",
  classification: "Class II",
  report_date: "20261120",
  recalling_firm: "Test Firm",
  product_description: "Test product",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("fetchRecalls", () => {
  it("asks openFDA for the last 12 months of food recalls, newest first", () => {
    expect(recallsUrl(now)).toBe("https://api.fda.gov/food/enforcement.json?search=report_date:[20251121+TO+20261121]&sort=report_date:desc&limit=1000");
  });

  it("uses live openFDA data when it answers", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ results: [record, { broken: true }] }));
    const result = await fetchRecalls({ now, fetchImpl, useCache: false });
    expect(result).toMatchObject({ source: "live", ignored: 1 });
    expect(result.recalls.map((r) => r.recallNumber)).toEqual(["H-9999-2027"]);
  });

  it("falls back to the saved real response when the API is offline", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const result = await fetchRecalls({ now, fetchImpl, useCache: false });
    expect(result.source).toBe("fixture");
    expect(result.reason).toBe("network error");
    expect(result.recalls.length).toBeGreaterThan(900);
  });

  it("falls back to the saved response after 5 seconds", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))),
    );
    const pending = fetchRecalls({ now, fetchImpl: fetchImpl as typeof fetch, useCache: false });
    await vi.advanceTimersByTimeAsync(5000);
    expect(await pending).toMatchObject({ source: "fixture", reason: "timeout" });
  });

  it("falls back on an error status or an unusable answer", async () => {
    expect(await fetchRecalls({ now, fetchImpl: async () => new Response("down", { status: 503 }), useCache: false })).toMatchObject({ source: "fixture", reason: "openFDA returned 503" });
    expect(await fetchRecalls({ now, fetchImpl: async () => Response.json({ results: [{ nope: 1 }] }), useCache: false })).toMatchObject({ source: "fixture" });
  });

  it("never calls the API in demo mode", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    const fetchImpl = vi.fn();
    const result = await fetchRecalls({ now, fetchImpl, useCache: false });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toMatchObject({ source: "fixture", reason: "demo-mode" });
  });
});
