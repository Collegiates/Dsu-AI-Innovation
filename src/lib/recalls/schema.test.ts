import { describe, expect, it } from "vitest";
import { parseRecalls } from "./schema";

const good = {
  recall_number: "H-1380-2026",
  reason_for_recall: "Potential E. coli O145:H28 Contamination",
  classification: "Class I",
  report_date: "20260923",
  recalling_firm: "Frutas y Hortalizas del Sur S.A.",
  product_description: "Organic Triple Berry Blend, NET WT 10 OZ",
  status: "Ongoing",
};

describe("parseRecalls", () => {
  it("turns openFDA records into recalls with readable dates", () => {
    expect(parseRecalls({ results: [good] }).recalls[0]).toMatchObject({ recallNumber: "H-1380-2026", date: "2026-09-23", classification: "Class I" });
  });

  it("ignores malformed records and counts them", () => {
    const missingNumber = { ...good, recall_number: undefined };
    const badDate = { ...good, report_date: "Sept 23" };
    const result = parseRecalls({ results: [good, missingNumber, badDate, "nonsense", null] });
    expect(result.recalls).toHaveLength(1);
    expect(result.ignored).toBe(4);
  });

  it("treats a response without a results list as empty", () => {
    expect(parseRecalls({ error: { code: "NOT_FOUND" } })).toEqual({ recalls: [], ignored: 0 });
    expect(parseRecalls("<html>")).toEqual({ recalls: [], ignored: 0 });
  });
});
