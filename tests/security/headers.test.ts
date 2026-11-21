import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

/** Reads the headers Next.js sends on every page, as one name → value lookup. */
async function headersForEveryPage(): Promise<Record<string, string>> {
  const rules = (await nextConfig.headers?.()) ?? [];
  const catchAll = rules.find((rule) => rule.source === "/(.*)");
  return Object.fromEntries((catchAll?.headers ?? []).map((h) => [h.key.toLowerCase(), h.value]));
}

describe("security headers", () => {
  it("applies a Content-Security-Policy to every page", async () => {
    const headers = await headersForEveryPage();
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
  });

  it("blocks other sites from framing the app", async () => {
    const headers = await headersForEveryPage();
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  });

  it("allows outgoing data requests only to our own site and openFDA", async () => {
    const headers = await headersForEveryPage();
    expect(headers["content-security-policy"]).toContain("connect-src 'self' https://api.fda.gov;");
  });

  it("does not allow eval() outside development", async () => {
    const headers = await headersForEveryPage();
    expect(headers["content-security-policy"]).not.toContain("unsafe-eval");
  });

  it("sets nosniff and a referrer policy", async () => {
    const headers = await headersForEveryPage();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });
});
