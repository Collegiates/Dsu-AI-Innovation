import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListEntry } from "@/lib/list/list";
import { readPreference, writePreference } from "@/lib/preferences/storage";
import { makeProduct, makeStore } from "@/lib/trip/test-fixtures";
import { TripPlanner } from "./TripPlanner";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const walmart = { ...makeStore("walmart-dover", 0, 0), chain: "Walmart" };
const aldi = { ...makeStore("aldi-dover", 4, 1), chain: "ALDI" };
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
  it("plans the saved list with the optimizer: Balance keeps one stop when the ALDI detour isn't worth it", () => {
    writePreference("list", list);
    render(<TripPlanner products={products} stores={[walmart, aldi]} />);
    expect(screen.getByRole("radio", { name: "Balance" })).toBeChecked();
    expect(screen.getAllByRole("article")).toHaveLength(1);
    const stop = screen.getByRole("article", { name: "Stop 1: Walmart" });
    expect(within(stop).getByText("$12.46")).toBeInTheDocument();
    expect(within(stop).getByText(/On your route/)).toBeInTheDocument();
    expect(screen.getByText("No savings this week")).toBeInTheDocument();
  });

  it("re-plans instantly and saves the choice when the preference changes", async () => {
    writePreference("list", list);
    const user = userEvent.setup();
    render(<TripPlanner products={products} stores={[walmart, aldi]} />);
    await user.click(screen.getByText("Maximize savings"));

    expect(screen.getByRole("radio", { name: "Maximize savings" })).toBeChecked();
    expect(readPreference("selectedPreference")).toBe("maxSavings");
    const aldiStop = screen.getByRole("article", { name: "Stop 2: ALDI" });
    expect(within(aldiStop).getByText("Barissimo Coffee")).toBeInTheDocument();
    expect(within(aldiStop).getByText(/Cheaper equivalent of your usual Great Value/)).toBeInTheDocument();
    // Typical $12.46 + $0 gas; the trip is $8.46 + $0.15 gas = $8.61, so it saves $3.85, with 4 + 10 extra minutes.
    expect(screen.getByText("$3.85")).toBeInTheDocument();
    const costs = screen.getByRole("region", { name: "Cost breakdown" });
    expect(within(costs).getByText("$8.61")).toBeInTheDocument();
    expect(within(costs).getByText("+14 min")).toBeInTheDocument();
  });

  it("compares the recommendation with the cheapest single-store and fastest trips", async () => {
    writePreference("list", list);
    writePreference("selectedPreference", "maxSavings");
    render(<TripPlanner products={products} stores={[walmart, aldi]} />);
    const table = screen.getByRole("table");
    const stopsRow = within(table).getByRole("row", { name: /Stops/ });
    expect(within(stopsRow).getAllByRole("cell").map((c) => c.textContent)).toEqual(["Walmart", "Walmart", "Walmart + ALDI"]);
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
