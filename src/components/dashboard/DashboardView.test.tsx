import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RECEIPT_UPLOADED_KEY } from "@/components/plan/AfterReceipt";
import type { DashboardData } from "@/lib/dashboard/data";
import { RECALL_LABEL, type RecallMatch } from "@/lib/recalls/match";
import { optimizeTrip } from "@/lib/trip/optimizer";
import { rankStores } from "@/lib/trip/rankStores";
import { makeProduct, makeStore } from "@/lib/trip/test-fixtures";
import { DashboardView } from "./DashboardView";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const walmart = { ...makeStore("walmart-dover", null, null), chain: "Walmart" };
const aldi = { ...makeStore("aldi-dover", null, null), chain: "ALDI" };
const products = [
  makeProduct("walmart-dover", "Coffee", 9.0, { groupKey: "coffee" }),
  makeProduct("aldi-dover", "Coffee", 5.0, { groupKey: "coffee" }),
  makeProduct("walmart-dover", "Milk", 3.46, { groupKey: "milk" }),
];

function fixture(overrides: Partial<DashboardData> = {}): DashboardData {
  const trip = optimizeTrip({
    basket: [{ usualProductId: "walmart-dover--coffee" }, { usualProductId: "walmart-dover--milk" }],
    products,
    stores: [walmart, aldi],
    // Time is free under maxSavings, so the $4 coffee saving is worth the second stop.
    preference: "maxSavings",
  });
  const ranking = rankStores([{ usualProductId: "walmart-dover--coffee" }, { usualProductId: "walmart-dover--milk" }], products, [walmart, aldi]);
  return { trip, ranking, swapSavingsCents: [], stores: [walmart, aldi], pricedStoreIds: ["walmart-dover", "aldi-dover"], itemCount: 2, unmatched: [], recall: null, recallCount: 0, deals: [], ...overrides };
}

describe("DashboardView", () => {
  // The savings and the winning store appear only after a receipt upload.
  beforeEach(() => localStorage.setItem(RECEIPT_UPLOADED_KEY, "true"));

  it("shows savings computed by the optimizer, not hard-coded numbers", () => {
    render(<DashboardView data={fixture()} />);
    // Typical $12.46 (coffee $9 + milk $3.46). Optimized: coffee at ALDI $5 + milk $3.46 = $8.46, no gas. Saves $4.00.
    const hero = screen.getByRole("region", { name: /you save/i });
    expect(within(hero).getByText("$4.00")).toBeInTheDocument();
    expect(within(hero).getByText("$12.46")).toBeInTheDocument();
    expect(within(hero).getByText("$8.46")).toBeInTheDocument();
    expect(within(hero).getByText("32% less")).toBeInTheDocument();
    expect(within(hero).getByRole("link", { name: /view trip plan/i })).toHaveAttribute("href", "/trip");
  });

  it("shows the recommended stores with subtotals, and no detour time or gas", () => {
    render(<DashboardView data={fixture()} />);
    const trip = screen.getByRole("region", { name: "Recommended trip" });
    expect(within(trip).getByText("2 stores")).toBeInTheDocument();
    expect(within(trip).getByText("$5.00")).toBeInTheDocument();
    expect(trip.textContent).not.toMatch(/\bmin\b|gas|detour|commute|on the way home/i);
  });

  it("shows calm empty states when there are no recalls or deals", () => {
    render(<DashboardView data={fixture()} />);
    expect(screen.getByText("No recall matches for this week's list")).toBeInTheDocument();
    expect(screen.getByText("No price drops on your waitlist")).toBeInTheDocument();
  });

  it("shows at most one recall, labeled as a possible match, linking to Recalls & Safety", () => {
    const recall: RecallMatch = {
      productId: "p",
      productName: "Great Value Fruit Cocktail",
      brand: "Great Value",
      recallNumber: "H-0167-2027",
      reason: "Potential contamination with elevated levels of lead.",
      classification: "Class II",
      date: "2026-10-28",
      firm: "Pacific Coast Producers",
      matchedWords: ["cocktail"],
      label: RECALL_LABEL,
    };
    render(<DashboardView data={fixture({ recall, recallCount: 3 })} />);
    expect(screen.getByText(RECALL_LABEL)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see all 3 possible matches/i })).toHaveAttribute("href", "/recalls");
  });

  it("says so when the usual trip is already the best value", () => {
    const trip = optimizeTrip({ basket: [{ usualProductId: "walmart-dover--milk" }], products, stores: [walmart, aldi], preference: "balanced" });
    render(<DashboardView data={fixture({ trip })} />);
    expect(screen.getByRole("heading", { name: "Your usual trip is the best value" })).toBeInTheDocument();
  });
});
