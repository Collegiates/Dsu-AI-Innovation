import { describe, expect, it } from "vitest";
import { APP_NAME, assumptions } from "./app";

describe("app config", () => {
  it("names the app GrocerySave", () => {
    expect(APP_NAME).toBe("GrocerySave");
  });

  it("uses the agreed trip assumptions", () => {
    expect(assumptions.gasCostPerMile).toBe(0.15);
    expect(assumptions.minutesPerExtraStop).toBe(10);
    expect(assumptions.timeValuePerMinute).toEqual({ fastest: 1, balanced: 0.3, maxSavings: 0 });
  });

  it("values time more for 'fastest' than 'balanced', and not at all for 'maxSavings'", () => {
    const { fastest, balanced, maxSavings } = assumptions.timeValuePerMinute;
    expect(fastest).toBeGreaterThan(balanced);
    expect(balanced).toBeGreaterThan(maxSavings);
    expect(maxSavings).toBe(0);
  });
});
