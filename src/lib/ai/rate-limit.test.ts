import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "./rate-limit";

describe("rate limiter", () => {
  it("allows up to the limit per window, then refuses with a retry time", () => {
    let t = 0;
    const check = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => t });
    expect([check("a"), check("a"), check("a")].every((r) => r.ok)).toBe(true);
    t = 18_000;
    expect(check("a")).toEqual({ ok: false, retryAfterSeconds: 42 });
    expect(check("b").ok).toBe(true);
    t = 60_000;
    expect(check("a").ok).toBe(true);
  });

  it("uses the first forwarded address, or 'local'", () => {
    expect(clientKey(new Request("http://x", { headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" } }))).toBe("203.0.113.5");
    expect(clientKey(new Request("http://x"))).toBe("local");
  });
});
