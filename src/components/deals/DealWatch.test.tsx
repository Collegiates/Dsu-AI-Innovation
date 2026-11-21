import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_WAITLIST } from "@/lib/config/demo";
import type { NextWeekPrices } from "@/lib/deals/nextWeek";
import { readPreference, writePreference } from "@/lib/preferences/storage";
import { makeProduct, makeStore } from "@/lib/trip/test-fixtures";
import { DealWatch } from "./DealWatch";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const stores = [{ ...makeStore("walmart-dover", 0, 0), chain: "Walmart" }, { ...makeStore("aldi-dover", 4, 1), chain: "ALDI" }];
const tide = makeProduct("aldi-dover", "Free & Gentle Detergent", 14.29, { brand: "Tide", groupKey: "detergent" });
const shampoo = makeProduct("walmart-dover", "Dandruff Shampoo", 2.84, { brand: "Equate", groupKey: "shampoo" });
const products = [tide, shampoo];
const nextWeek: NextWeekPrices = { simulated: true, note: "SIMULATED", changes: [{ productId: tide.id, salePrice: 11.99 }] };

beforeEach(() => localStorage.clear());

describe("Deal Watch", () => {
  it("starts empty and can load the demo waitlist", async () => {
    const user = userEvent.setup();
    render(<DealWatch products={products} stores={stores} nextWeek={nextWeek} />);
    expect(screen.getByText("Your waitlist is empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to My List" })).toHaveAttribute("href", "/list");
    await user.click(screen.getByRole("button", { name: "Load demo waitlist" }));
    expect(readPreference("waitlist")).toEqual(DEMO_WAITLIST);
  });

  it("shows each item's best price and store today", () => {
    writePreference("waitlist", [{ groupKey: "detergent" }, { groupKey: "shampoo" }]);
    render(<DealWatch products={products} stores={stores} nextWeek={nextWeek} />);
    const row = screen.getByRole("listitem", { name: "Tide Free & Gentle Detergent" });
    expect(within(row).getByText("$14.29")).toBeInTheDocument();
    expect(within(row).getByText(/cheapest at ALDI/)).toBeInTheDocument();
    expect(screen.getByText(/alerts are sent by email/)).toBeInTheDocument();
  });

  it("simulates next week: the drop shows the old price struck through, the new price, % saved and the store", async () => {
    writePreference("waitlist", [{ groupKey: "detergent" }, { groupKey: "shampoo" }]);
    const user = userEvent.setup();
    render(<DealWatch products={products} stores={stores} nextWeek={nextWeek} />);
    await user.click(screen.getByRole("button", { name: "Simulate next week's prices" }));

    expect(screen.getByText(/made up for the demo/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 of 2 waitlist items are deals next week.");
    const row = screen.getByRole("listitem", { name: "Tide Free & Gentle Detergent" });
    expect(row.querySelector("s")).toHaveTextContent("$14.29");
    expect(within(row).getByText("$11.99")).toBeInTheDocument();
    expect(within(row).getByText(/16% less at ALDI/)).toBeInTheDocument();
    expect(within(screen.getByRole("listitem", { name: "Equate Dandruff Shampoo" })).getByText("No drop next week")).toBeInTheDocument();
  });

  it("saves a target price, clears it when emptied, and flags an item already at or under its target", async () => {
    writePreference("waitlist", [{ groupKey: "shampoo" }]);
    const user = userEvent.setup();
    render(<DealWatch products={products} stores={stores} nextWeek={nextWeek} />);
    const input = screen.getByLabelText("Target price for Equate Dandruff Shampoo");
    await user.type(input, "3{Enter}");
    expect(readPreference("waitlist")).toEqual([{ groupKey: "shampoo", targetPrice: 3 }]);
    expect(screen.getByText(/at or under your target/)).toBeInTheDocument();
    await user.clear(input);
    await user.tab();
    expect(readPreference("waitlist")).toEqual([{ groupKey: "shampoo" }]);
  });

  it("removes an item from the waitlist", async () => {
    writePreference("waitlist", [{ groupKey: "detergent" }, { groupKey: "shampoo" }]);
    const user = userEvent.setup();
    render(<DealWatch products={products} stores={stores} nextWeek={nextWeek} />);
    await user.click(screen.getByRole("button", { name: "Remove Equate Dandruff Shampoo from Deal Watch" }));
    expect(readPreference("waitlist")).toEqual([{ groupKey: "detergent" }]);
  });

  it("hides the simulate button when the simulated prices file is unavailable, and handles items no store sells", () => {
    writePreference("waitlist", [{ groupKey: "caviar" }]);
    render(<DealWatch products={products} stores={stores} nextWeek={null} />);
    expect(screen.queryByRole("button", { name: "Simulate next week's prices" })).not.toBeInTheDocument();
    expect(screen.getByText("None of the stores sells this right now.")).toBeInTheDocument();
  });
});
