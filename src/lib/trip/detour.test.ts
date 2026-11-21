import { describe, expect, it } from "vitest";
import { detourText } from "./detour";

describe("detourText", () => {
  it("says a store with no detour is on the route, and shows minutes and miles otherwise", () => {
    expect(detourText({ detourMinutes: 0, detourMiles: 0 })).toBe("On your route");
    expect(detourText({ detourMinutes: 4, detourMiles: 1.2 })).toBe("+4 min · 1.2 mi");
    expect(detourText({ detourMinutes: 0, detourMiles: 0.3 })).toBe("+0 min · 0.3 mi");
  });
});
