/**
 * Counts requests per visitor and refuses them once a limit is reached within a time window,
 * so one person (or a script) can't run up AI costs or slow the app down.
 * Example: with limit 30 per 60 seconds, the 31st request in a minute gets { ok: false, retryAfterSeconds: 42 }.
 * Counts live in memory, which is enough for one demo server.
 */
export function createRateLimiter(options: { limit: number; windowMs: number; now?: () => number }) {
  const now = options.now ?? Date.now;
  const windows = new Map<string, { start: number; count: number }>();

  return function check(key: string): { ok: true } | { ok: false; retryAfterSeconds: number } {
    const t = now();
    // Drop finished windows now and then so memory doesn't grow forever.
    if (windows.size > 10_000) {
      for (const [k, w] of windows) if (t - w.start >= options.windowMs) windows.delete(k);
    }
    const current = windows.get(key);
    if (!current || t - current.start >= options.windowMs) {
      windows.set(key, { start: t, count: 1 });
      return { ok: true };
    }
    if (current.count >= options.limit) {
      return { ok: false, retryAfterSeconds: Math.ceil((current.start + options.windowMs - t) / 1000) };
    }
    current.count += 1;
    return { ok: true };
  };
}

/**
 * Picks the visitor's address from the request, for rate limiting.
 * Example: a request with "x-forwarded-for: 203.0.113.5, 10.0.0.1" counts against 203.0.113.5.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}
