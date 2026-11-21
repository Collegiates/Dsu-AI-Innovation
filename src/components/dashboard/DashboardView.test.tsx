import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DashboardData } from "@/lib/dashboard/data";
import { RECALL_LABEL, type RecallMatch } from "@/lib/recalls/match";
import { optimizeTrip } from "@/lib/trip/optimizer";
import { makeProduct, makeStore } from "@/lib/trip/test-fixtures";
import { DashboardView } from "./DashboardView";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const walmart = { ...makeStore("walmart-dover", 0, 0), chain: "Walmart" };
const aldi = { ...makeStore("aldi-dover", 4, 1), chain: "ALDI" };
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
    // Time is free under maxSavings, so the $4 coffee saving is worth the 14-minute ALDI detour.
    preference: "maxSavings",
  });
  return { trip, stores: [walmart, aldi], itemCount: 2, unmatched: [], recall: null, recallCount: 0, deals: [], ...overrides };
}

describe("DashboardView", () => {
  it("shows savings computed by the optimizer, not hard-coded numbers", () => {
    render(<DashboardView data={fixture()} />);
    // Typical $12.46 (coffee $9 + milk $3.46). Optimized: coffee at ALDI $5 + milk $3.46 + $0.15 gas = $8.61. Saves $3.85.
    const hero = screen.getByRole("region", { name: /you save/i });
    expect(within(hero).getByText("$3.85")).toBeInTheDocument();
    expect(within(hero).getByText("$12.46")).toBeInTheDocument();
    expect(within(hero).getByText("$8.61")).toBeInTheDocument();
    expect(within(hero).getByText("31% less")).toBeInTheDocument();
    expect(within(hero).getByRole("link", { name: /view trip plan/i })).toHaveAttribute("href", "/trip");
  });

  it("shows the recommended stops with subtotals, extra time and gas", () => {
    render(<DashboardView data={fixture()} />);
    const trip = screen.getByRole("region", { name: "Recommended trip" });
    expect(within(trip).getByText("2 stops on the way home")).toBeInTheDocument();
    expect(within(trip).getByText("+14 min")).toBeInTheDocument();
    expect(within(trip).getByRole("img", { name: "Drive from DSU to Home. Stops: Walmart, ALDI." })).toBeInTheDocument();
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
