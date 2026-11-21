import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { readPreference, writePreference } from "@/lib/preferences/storage";
import { makeProduct, makeStore } from "@/lib/trip/test-fixtures";
import { SwapsView, type ExplainedSwap } from "./SwapsView";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("sonner", () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn() });
  return { toast };
});

const stores = [{ ...makeStore("walmart-dover", 0, 0), chain: "Walmart" }, { ...makeStore("aldi-dover", 4, 1), chain: "ALDI" }];
const gvButter = makeProduct("walmart-dover", "Creamy Peanut Butter", 1.98, { brand: "Great Value", category: "pantry", groupKey: "peanut-butter-creamy" });
const pdButter = makeProduct("aldi-dover", "Creamy Peanut Butter", 1.65, { brand: "Peanut Delight", category: "pantry", groupKey: "peanut-butter-creamy" });
const products = [gvButter, pdButter];

const swap: ExplainedSwap = {
  id: `${gvButter.id}->${pdButter.id}`,
  basketIndex: 0,
  from: gvButter,
  to: pdButter,
  fromCents: 198,
  toCents: 165,
  savingsCents: 33,
  savingsPercent: 17,
  fromUnitPrice: 0.124,
  toUnitPrice: 0.103,
  unit: "oz",
  explanation: { text: "Switch to Peanut Delight Creamy Peanut Butter at ALDI and save $0.33 (17%).", source: "template" },
};

function mockSwaps(swaps: ExplainedSwap[] | null) {
  const fetchMock = vi.fn(async () => (swaps ? Response.json({ swaps }) : new Response("", { status: 500 })));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const renderView = () =>
  render(
    <TooltipProvider>
      <SwapsView products={products} stores={stores} />
    </TooltipProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  vi.mocked(toast).mockClear();
  writePreference("list", [{ text: "peanut butter", quantity: 1, label: "Similar", productId: gvButter.id }]);
});
afterEach(() => vi.unstubAllGlobals());

describe("Smart Swaps", () => {
  it("asks /api/swaps about the saved list and shows the swap with unit prices, weekly saving and explanation", async () => {
    const fetchMock = mockSwaps([swap]);
    renderView();
    const row = await screen.findByRole("listitem", { name: /Swap Great Value Creamy Peanut Butter for Peanut Delight/ });
    expect(fetchMock).toHaveBeenCalledWith("/api/swaps", expect.objectContaining({ body: JSON.stringify({ basket: [{ usualProductId: gvButter.id }], hiddenBrands: [], hiddenProducts: [] }) }));
    expect(within(row).getByText("12.4¢/oz", { exact: false })).toBeInTheDocument();
    expect(within(row).getByText("10.3¢/oz")).toBeInTheDocument();
    expect(within(row).getByText("$0.33")).toBeInTheDocument();
    expect(within(row).getByText(/a week · 17% less/)).toBeInTheDocument();
    expect(within(row).getByText(/Switch to Peanut Delight/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Manage hidden brands/ })).toHaveAttribute("href", "/settings");
  });

  it("'Try it' puts the suggested product on the list, with an undo", async () => {
    mockSwaps([swap]);
    const user = userEvent.setup();
    renderView();
    await user.click(await screen.findByRole("button", { name: "Try it" }));
    expect(readPreference("list")[0].productId).toBe(pdButter.id);

    const undo = vi.mocked(toast.success).mock.calls[0][1] as unknown as { action: { onClick: () => void } };
    undo.action.onClick();
    expect(readPreference("list")[0].productId).toBe(gvButter.id);
  });

  it("'Never show again' hides the whole brand: the row disappears at once, and undo restores it", async () => {
    const fetchMock = mockSwaps([swap]);
    const user = userEvent.setup();
    renderView();
    await user.click(await screen.findByRole("button", { name: /Never show again/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Everything from Peanut Delight" }));

    expect(readPreference("hiddenBrands")).toEqual(["Peanut Delight"]);
    expect(screen.queryByRole("listitem", { name: /Peanut Delight/ })).not.toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith("/api/swaps", expect.objectContaining({ body: expect.stringContaining('"hiddenBrands":["Peanut Delight"]') })));

    const undo = vi.mocked(toast).mock.calls[0][1] as unknown as { action: { onClick: () => void } };
    undo.action.onClick();
    expect(readPreference("hiddenBrands")).toEqual([]);
  });

  it("can hide just this product instead of the brand", async () => {
    mockSwaps([swap]);
    const user = userEvent.setup();
    renderView();
    await user.click(await screen.findByRole("button", { name: /Never show again/ }));
    await user.click(await screen.findByRole("menuitem", { name: /This product/ }));
    expect(readPreference("hiddenProducts")).toEqual([pdButter.id]);
    expect(readPreference("hiddenBrands")).toEqual([]);
  });

  it("says so when there is nothing cheaper, and shows a calm error when the request fails", async () => {
    mockSwaps([]);
    const { unmount } = renderView();
    expect(await screen.findByText("You're already buying the best value we found")).toBeInTheDocument();
    unmount();
    mockSwaps(null);
    renderView();
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
  });

  it("points to My List when the list is empty, without calling the API", () => {
    localStorage.clear();
    const fetchMock = mockSwaps([swap]);
    renderView();
    expect(screen.getByText("No list to find swaps for")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
