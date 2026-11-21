/**
 * Keeps our own calls to Gemini under Google's per-minute limit, so the free tier doesn't answer "quota exceeded".
 * Before each call, acquire(maxWaitMs) waits for a free slot, or returns false if that would take too long.
 * Example: with limit 90 per minute, the 91st call in a minute waits until the oldest one is a minute old.
 * This protects the Gemini key; the per-visitor limit on our API routes lives in rate-limit.ts.
 */
export function createQuotaPacer(options: {
  limit: number;
  windowMs: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}) {
  if (!(options.limit > 0)) throw new Error("Quota limit must be at least 1");
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  // Start times of calls in the current window, oldest first.
  const starts: number[] = [];
  // Callers queue up one at a time, so two of them can't both take the last free slot.
  let queue: Promise<unknown> = Promise.resolve();

  async function take(maxWaitMs: number): Promise<boolean> {
    for (;;) {
      const t = now();
      while (starts.length > 0 && t - starts[0] >= options.windowMs) starts.shift();
      if (starts.length < options.limit) {
        starts.push(t);
        return true;
      }
      const wait = starts[0] + options.windowMs - t;
      if (wait > maxWaitMs) return false;
      maxWaitMs -= wait;
      await sleep(wait);
    }
  }

  return {
    acquire(maxWaitMs: number): Promise<boolean> {
      const result = queue.then(() => take(maxWaitMs));
      queue = result.catch(() => undefined);
      return result;
    },
  };
}
