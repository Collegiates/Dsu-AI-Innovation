import { describe, expect, it } from "vitest";
import { formatMoney, formatSize, formatUnitPrice, toCents } from "./money";

describe("money", () => {
  it("formats cents as dollars", () => {
    expect(formatMoney(327)).toBe("$3.27");
    expect(formatMoney(0)).toBe("$0.00");
    expect(formatMoney(123456)).toBe("$1,234.56");
  });

  it("formats negative amounts", () => {
    expect(formatMoney(-150)).toBe("-$1.50");
  });

  it("rounds dollars to whole cents", () => {
    expect(toCents(1.09)).toBe(109);
    expect(toCents(0.15 * 3)).toBe(45);
  });

  it("shows small unit prices in cents and larger ones in dollars", () => {
    expect(formatUnitPrice(0.0234, "fl_oz")).toBe("2.3¢/fl oz");
    expect(formatUnitPrice(3.29, "lb")).toBe("$3.29/lb");
  });

  it("shows package sizes the way labels print them", () => {
    expect(formatSize(84, "fl_oz")).toBe("84 fl oz");
    expect(formatSize(1, "gal")).toBe("1 gal");
    expect(formatSize(5.4, "oz")).toBe("5.4 oz");
  });
});
