import { describe, expect, it } from "vitest";
import { createQuotaPacer } from "./quota";

/** A fake clock: sleeping just moves time forward, so tests run instantly. */
function fakeClock() {
  const clock = { t: 0, slept: [] as number[] };
  return {
    clock,
    now: () => clock.t,
    sleep: async (ms: number) => {
      clock.slept.push(ms);
      clock.t += ms;
    },
  };
}

describe("quota pacer (keeps our own Gemini calls under Google's per-minute limit)", () => {
  it("lets calls through right away while under the limit", async () => {
    const { clock, now, sleep } = fakeClock();
    const pacer = createQuotaPacer({ limit: 3, windowMs: 60_000, now, sleep });
    for (let i = 0; i < 3; i++) await expect(pacer.acquire(0)).resolves.toBe(true);
    expect(clock.slept).toEqual([]);
  });

  it("waits until the oldest call is a minute old when the limit is reached", async () => {
    const { clock, now, sleep } = fakeClock();
    const pacer = createQuotaPacer({ limit: 2, windowMs: 60_000, now, sleep });
    await pacer.acquire(0);
    clock.t = 10_000;
    await pacer.acquire(0);
    clock.t = 20_000;
    await expect(pacer.acquire(120_000)).resolves.toBe(true);
    expect(clock.slept).toEqual([40_000]);
    expect(clock.t).toBe(60_000);
  });

  it("refuses instead of waiting longer than the caller allows", async () => {
    const { clock, now, sleep } = fakeClock();
    const pacer = createQuotaPacer({ limit: 1, windowMs: 60_000, now, sleep });
    await pacer.acquire(0);
    clock.t = 1_000;
    await expect(pacer.acquire(5_000)).resolves.toBe(false);
    expect(clock.slept).toEqual([]);
  });

  it("never lets more than the limit through when many calls arrive at once", async () => {
    const { clock, now, sleep } = fakeClock();
    const pacer = createQuotaPacer({ limit: 3, windowMs: 60_000, now, sleep });
    const started: number[] = [];
    await Promise.all(Array.from({ length: 7 }, () => pacer.acquire(10 * 60_000).then(() => started.push(clock.t))));
    // In any 60-second stretch, at most 3 calls started.
    for (const t of started) expect(started.filter((s) => s >= t && s < t + 60_000).length).toBeLessThanOrEqual(3);
    expect(started).toHaveLength(7);
  });

  it("treats a limit of zero or less as a setup mistake", () => {
    expect(() => createQuotaPacer({ limit: 0, windowMs: 60_000 })).toThrow();
  });
});
