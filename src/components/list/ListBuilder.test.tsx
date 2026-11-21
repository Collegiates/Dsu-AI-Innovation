import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_LIST } from "@/lib/config/demo";
import type { MatchResult } from "@/lib/matching/core";
import { readPreference } from "@/lib/preferences/storage";
import { makeProduct, makeStore } from "@/lib/trip/test-fixtures";
import { ListBuilder } from "./ListBuilder";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

const stores = [{ ...makeStore("walmart-dover", 0, 0), chain: "Walmart" }, { ...makeStore("aldi-dover", 4, 1), chain: "ALDI" }];
const milk = makeProduct("walmart-dover", "2% Reduced Fat Milk", 3.46, { brand: "Great Value", groupKey: "milk-2pct-1gal", sizeValue: 1, sizeUnit: "gal" });
const toothpaste = makeProduct("aldi-dover", "Whitening Toothpaste", 4.55, { brand: "Crest", groupKey: "toothpaste-fluoride-whitening", sizeValue: 5.4 });
const products = [milk, toothpaste];

const result = (input: string, product: typeof milk | null, label: MatchResult["label"]): MatchResult => ({
  input,
  label,
  method: "keywords",
  score: 1,
  groupKey: product?.groupKey ?? null,
  best: product,
  options: product ? [product] : [],
  otherVariants: [],
});

function mockMatch(results: MatchResult[] | null) {
  const fetchMock = vi.fn(async () => (results ? Response.json({ results }) : new Response("", { status: 500 })));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("My List", () => {
  it("loads the demo list, matches it through /api/match, shows confidence, and saves the list", async () => {
    const fetchMock = mockMatch([result("2% milk", milk, "Same product"), result("toothpaste", toothpaste, "Similar"), result("lawn mower", null, "No match")]);
    const user = userEvent.setup();
    render(<ListBuilder products={products} stores={stores} />);

    await user.click(screen.getByRole("button", { name: "Load my usual list" }));
    expect(screen.getByLabelText("Your list")).toHaveValue(DEMO_LIST.join("\n"));
    await user.click(screen.getByRole("button", { name: "Match my list" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/match", expect.objectContaining({ method: "POST", body: JSON.stringify({ items: [...DEMO_LIST] }) }));
    const rows = await screen.findAllByRole("listitem");
    expect(within(rows[0]).getByText("Same product")).toBeInTheDocument();
    expect(within(rows[0]).getByText(/Great Value 2% Reduced Fat Milk/)).toBeInTheDocument();
    expect(within(rows[0]).getByText("$3.46")).toBeInTheDocument();
    expect(within(rows[1]).getByText(/Close match/)).toBeInTheDocument();
    expect(within(rows[2]).getByText("No match")).toBeInTheDocument();
    expect(within(rows[2]).getByText(/Try a simpler name/)).toBeInTheDocument();
    expect(readPreference("list").map((e) => e.productId)).toEqual([milk.id, toothpaste.id, null]);
    expect(screen.getByRole("link", { name: /build my trip plan/i })).toHaveAttribute("href", "/trip");
  });

  it("changes quantities with the stepper and keeps them between 1 and 20", async () => {
    mockMatch([result("2% milk", milk, "Same product")]);
    const user = userEvent.setup();
    render(<ListBuilder products={products} stores={stores} />);
    await user.type(screen.getByLabelText("Your list"), "2% milk");
    await user.click(screen.getByRole("button", { name: "Match my list" }));

    const fewer = await screen.findByRole("button", { name: "One fewer 2% milk" });
    expect(fewer).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "One more 2% milk" }));
    await user.click(screen.getByRole("button", { name: "One more 2% milk" }));
    expect(within(screen.getByRole("group", { name: "Quantity of 2% milk" })).getByText("3")).toBeInTheDocument();
    expect(readPreference("list")[0].quantity).toBe(3);
  });

  it("moves an occasional item to Deal Watch and takes it off the list", async () => {
    mockMatch([result("2% milk", milk, "Same product"), result("toothpaste", toothpaste, "Same product")]);
    const user = userEvent.setup();
    render(<ListBuilder products={products} stores={stores} />);
    await user.type(screen.getByLabelText("Your list"), "2% milk, toothpaste");
    await user.click(screen.getByRole("button", { name: "Match my list" }));

    await user.click(await screen.findByRole("button", { name: "Move toothpaste to Deal Watch" }));
    expect(readPreference("waitlist")).toEqual([{ groupKey: "toothpaste-fluoride-whitening" }]);
    expect(readPreference("list").map((e) => e.text)).toEqual(["2% milk"]);
    expect(screen.queryByText("“toothpaste”")).not.toBeInTheDocument();
  });

  it("shows an empty state first, and a plain error when nothing was typed", async () => {
    const fetchMock = mockMatch([]);
    const user = userEvent.setup();
    render(<ListBuilder products={products} stores={stores} />);
    expect(screen.getByText("Your list is empty")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /build my trip plan/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Match my list" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/type at least one item/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a generic error, and keeps the saved list, when matching fails", async () => {
    mockMatch(null);
    const user = userEvent.setup();
    render(<ListBuilder products={products} stores={stores} />);
    await user.type(screen.getByLabelText("Your list"), "milk");
    await user.click(screen.getByRole("button", { name: "Match my list" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
    expect(readPreference("list")).toEqual([]);
  });
});
