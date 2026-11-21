import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writePreference } from "@/lib/preferences/storage";
import { RECALL_LABEL, type RecallMatch } from "@/lib/recalls/match";
import { makeProduct } from "@/lib/trip/test-fixtures";
import { fdaRecordUrl, RecallsView } from "./RecallsView";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const gvCocktail = makeProduct("walmart-dover", "Fruit Cocktail", 1.24, { brand: "Great Value", groupKey: "fruit-cocktail" });
const aldiCocktail = makeProduct("aldi-dover", "Fruit Cocktail", 1.09, { brand: "Happy Harvest", groupKey: "fruit-cocktail" });
const milk = makeProduct("walmart-dover", "Milk", 3.46, { groupKey: "milk" });
const products = [gvCocktail, aldiCocktail, milk];

const match: RecallMatch = {
  productId: gvCocktail.id,
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

function mockRecalls(body: object | null) {
  const fetchMock = vi.fn(async () => (body ? Response.json(body) : new Response("", { status: 500 })));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  localStorage.clear();
  writePreference("list", [{ text: "fruit cocktail", quantity: 1, label: "Same product", productId: gvCocktail.id }]);
});
afterEach(() => vi.unstubAllGlobals());

describe("Recalls & Safety", () => {
  it("checks the list and its equivalents, then shows each possible match with every detail and the lot-code message", async () => {
    const fetchMock = mockRecalls({ source: "live", checked: 1000, label: RECALL_LABEL, matches: [match] });
    const user = userEvent.setup();
    render(<RecallsView products={products} />);
    expect(screen.getByText("Not checked yet")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Check my list now" }));

    // The usual product and the cheaper equivalent the trip might buy are both checked.
    expect(fetchMock).toHaveBeenCalledWith("/api/recalls", expect.objectContaining({ body: JSON.stringify({ productIds: [gvCocktail.id, aldiCocktail.id] }) }));
    const card = await screen.findByRole("listitem", { name: "Possible recall: Great Value Fruit Cocktail" });
    expect(within(card).getByText(RECALL_LABEL)).toBeInTheDocument();
    expect(within(card).getByText(/elevated levels of lead/)).toBeInTheDocument();
    expect(within(card).getByText("Class II")).toBeInTheDocument();
    expect(within(card).getByText("Oct 28, 2026")).toBeInTheDocument();
    expect(within(card).getByText("H-0167-2027")).toBeInTheDocument();
    expect(within(card).getByText("Pacific Coast Producers")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /View the FDA record/ })).toHaveAttribute("href", fdaRecordUrl("H-0167-2027"));
    expect(screen.getByRole("status")).toHaveTextContent(/Last checked .* against 1,000 FDA food recalls .* Live from openFDA/);
  });

  it("says when the saved copy was used and when nothing matched", async () => {
    mockRecalls({ source: "fixture", checked: 999, label: RECALL_LABEL, matches: [] });
    const user = userEvent.setup();
    render(<RecallsView products={products} />);
    await user.click(screen.getByRole("button", { name: "Check my list now" }));
    expect(await screen.findByText("No recall matches for this week's list")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saved copy of openFDA data (offline)");
  });

  it("shows a calm error when the check fails", async () => {
    mockRecalls(null);
    const user = userEvent.setup();
    render(<RecallsView products={products} />);
    await user.click(screen.getByRole("button", { name: "Check my list now" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
  });

  it("points to My List when there is nothing to check", () => {
    localStorage.clear();
    render(<RecallsView products={products} />);
    expect(screen.getByText("No list to check yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check my list now" })).not.toBeInTheDocument();
  });

  it("builds an FDA record link that safely encodes the recall number", () => {
    expect(fdaRecordUrl("H-0167-2027")).toBe("https://api.fda.gov/food/enforcement.json?search=recall_number:%22H-0167-2027%22");
    expect(fdaRecordUrl('x" OR "1')).not.toContain('"');
  });

  it("shows the national recall example as a labeled hypothetical past purchase, with the FDA's lot code and link", () => {
    render(<RecallsView products={[]} />);
    const card = screen.getByRole("region", { name: "Great Value Organic Triple Berry Blend, 10 oz" });
    expect(card).toHaveTextContent("Past purchases (demo)");
    expect(card).toHaveTextContent("National recall example: hypothetical past purchase; not listed for Delaware.");
    expect(card).toHaveTextContent("6040 01-6");
    expect(card).toHaveTextContent("7874211226");
    expect(within(card).getByRole("link", { name: /Read the FDA announcement/ })).toHaveAttribute("href", expect.stringMatching(/^https:\/\/www\.fda\.gov\//));
  });
});
