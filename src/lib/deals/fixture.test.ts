import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadNextWeekPrices } from "./fixture";

describe("loadNextWeekPrices", () => {
  it("reads the real fixture, which is marked simulated", () => {
    const fixture = loadNextWeekPrices();
    expect(fixture?.simulated).toBe(true);
    expect(fixture?.changes.length).toBeGreaterThan(0);
  });

  it("returns null for a missing file or one that doesn't say it is simulated", () => {
    const dir = mkdtempSync(join(tmpdir(), "nextweek-"));
    expect(loadNextWeekPrices(dir)).toBeNull();
    writeFileSync(join(dir, "prices-next-week.json"), JSON.stringify({ simulated: false, note: "real?", changes: [] }));
    expect(loadNextWeekPrices(dir)).toBeNull();
  });
});
