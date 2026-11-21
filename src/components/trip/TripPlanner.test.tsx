import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListEntry } from "@/lib/list/list";
import { readPreference, writePreference } from "@/lib/preferences/storage";
import { makeProduct, makeStore } from "@/lib/trip/test-fixtures";
import { TripPlanner } from "./TripPlanner";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

// Like the real data: the shopper picked these stores, and no detour was measured (null, never 0).
const walmart = { ...makeStore("walmart-dover", null, null), chain: "Walmart" };
const aldi = { ...makeStore("aldi-dover", null, null), chain: "ALDI" };
const products = [
  makeProduct("walmart-dover", "Coffee", 9.0, { groupKey: "coffee", brand: "Great Value" }),
  makeProduct("aldi-dover", "Coffee", 5.0, { groupKey: "coffee", brand: "Barissimo" }),
  makeProduct("walmart-dover", "Milk", 3.46, { groupKey: "milk", brand: "Great Value", sizeValue: 1, sizeUnit: "gal" }),
];
const list: ListEntry[] = [
  { text: "coffee", quantity: 1, label: "Same product", productId: "walmart-dover--coffee" },
  { text: "milk", quantity: 1, label: "Same product", productId: "walmart-dover--milk" },
];

beforeEach(() => localStorage.clear());

describe("Trip Plan", () => {
  it("Balance: shows 'Shop at ALDI + Walmart' with each store's own total beside it, when ALDI saves more than the extra stop", () => {
    writePreference("list", list);
    render(<TripPlanner products={products} stores={[walmart, aldi]} />);
    expect(screen.getByRole("radio", { name: "Balance" })).toBeChecked();
    // Coffee at ALDI saves $4.00, more than the extra stop is worth ($3.00 = 10 min × $0.30), so both stores are used.
    expect(screen.getByRole("heading", { level: 2, name: "Shop at ALDI + Walmart: $8.46" })).toBeInTheDocument();
    const others = screen.getByRole("list", { name: "Other stores" });
    expect(others).toHaveTextContent("Walmart only: $12.46");
    expect(others).toHaveTextContent("ALDI only: $5.00");
    expect(others).toHaveTextContent("1 item not sold there");
    expect(screen.getByRole("region", { name: /^Shop at/ })).toHaveTextContent("You save $4.00");
    // The trip buys the cheaper Barissimo coffee, and its chip shows the same saving Smart Swaps would.
    const aldiStop = screen.getByRole("article", { name: /: ALDI$/ });
    expect(within(aldiStop).getByRole("link", { name: /Cheaper swap: save \$4\.00/ })).toHaveAttribute("href", "/swaps");
  });

  it("never shows detour minutes, miles or gas", () => {
    writePreference("list", list);
    const { container } = render(<TripPlanner products={products} stores={[walmart, aldi]} />);
    // "10 min at $0.30/min" (what an extra stop is worth) is allowed; detour labels like "+4 min · 1.2 mi" are not.
    expect(container.textContent).not.toMatch(/\+\d+ min|\d mi\b|gas|detour|on your route|commute/i);
  });

  it("re-plans instantly and saves the choice: 'Fewest stops' keeps one store, with a cheaper-swap chip on the coffee", async () => {
    writePreference("list", list);
    const user = userEvent.setup();
    render(<TripPlanner products={products} stores={[walmart, aldi]} />);
    await user.click(screen.getByRole("radio", { name: "Fewest stops" }));

    expect(screen.getByRole("radio", { name: "Fewest stops" })).toBeChecked();
    expect(readPreference("selectedPreference")).toBe("fastest");
    expect(screen.getByRole("heading", { level: 2, name: "Shop at Walmart: $12.46" })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
    // The Barissimo coffee at ALDI is $4.00 cheaper than the Great Value coffee this one-store trip buys.
    const chip = screen.getByRole("link", { name: /Cheaper swap: save \$4\.00/ });
    expect(chip).toHaveAttribute("href", "/swaps");
  });

  it("uses only the stores the shopper picked", () => {
    writePreference("list", list);
    writePreference("selectedStores", ["walmart-dover"]);
    render(<TripPlanner products={products} stores={[walmart, aldi]} />);
    expect(screen.getByRole("heading", { level: 2, name: "Shop at Walmart: $12.46" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Other stores" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Cheaper swap/ })).not.toBeInTheDocument();
  });

  it("asks the shopper to pick a store when none of the picked stores has prices", () => {
    writePreference("list", list);
    writePreference("selectedStores", ["target-dover"]);
    render(<TripPlanner products={products} stores={[walmart, aldi]} />);
    expect(screen.getByText("Pick at least one store")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Choose stores" })).toHaveAttribute("href", "/plan");
  });

  it("shows the past-purchase recall banner, and says this week's list has no recall matches", () => {
    writePreference("list", list);
    render(<TripPlanner products={products} stores={[walmart, aldi]} />);
    const banner = screen.getByRole("note", { name: "Recall alert" });
    expect(banner).toHaveTextContent("Possible recall in your past purchases");
    expect(within(banner).getByRole("link", { name: "check the lot code" })).toHaveAttribute("href", "/recalls");
    expect(banner).toHaveTextContent("No recall matches for this week's list.");
  });

  it("compares the recommendation with the cheapest single-store and fewest-stops trips", async () => {
    writePreference("list", list);
    writePreference("selectedPreference", "maxSavings");
    render(<TripPlanner products={products} stores={[walmart, aldi]} />);
    const table = screen.getByRole("table");
    const stopsRow = within(table).getByRole("row", { name: /Stops/ });
    expect(within(stopsRow).getAllByRole("cell").map((c) => c.textContent)).toEqual(["Walmart", "Walmart", "ALDI + Walmart"]);
  });

  it("lists items that can't be bought or weren't matched, instead of pricing them at $0", () => {
    writePreference("list", [
      ...list,
      { text: "rocket fuel", quantity: 1, label: "No match", productId: null },
      { text: "caviar", quantity: 1, label: "Same product", productId: "target-dover--caviar" },
    ]);
    render(<TripPlanner products={products} stores={[walmart, aldi]} />);
    const note = screen.getByRole("note", { name: "Missing items" });
    expect(note).toHaveTextContent("“rocket fuel”");
    expect(note).toHaveTextContent("“caviar”");
  });

  it("shows an empty state with a link to My List when there is nothing to plan", () => {
    render(<TripPlanner products={products} stores={[walmart, aldi]} />);
    expect(screen.getByText("Nothing to plan yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to My List" })).toHaveAttribute("href", "/list");
  });
});
