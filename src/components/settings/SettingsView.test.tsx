import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readPreference, writePreference } from "@/lib/preferences/storage";
import { makeProduct, makeStore } from "@/lib/trip/test-fixtures";
import { SettingsView } from "./SettingsView";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const stores = [
  { ...makeStore("aldi-dover", null, null), chain: "ALDI", name: "ALDI Dover", address: "10 N Dupont Hwy, Dover, DE 19901" },
  { ...makeStore("target-dover", null, null), chain: "Target", name: "Target Dover", address: "148 John Hunn Brown Rd, Dover, DE 19901" },
];
const butter = makeProduct("aldi-dover", "Creamy Peanut Butter", 1.65, { brand: "Peanut Delight" });

beforeEach(() => localStorage.clear());

describe("Settings", () => {
  it("shows the stores by name and address, with no detours; stores without prices can't be picked", async () => {
    const user = userEvent.setup();
    render(<SettingsView products={[butter]} stores={stores} />);
    const picker = screen.getByRole("region", { name: "Your stores" });
    expect(picker).toHaveTextContent("10 N Dupont Hwy, Dover, DE 19901");
    expect(picker.textContent).not.toMatch(/\bmin\b|\bmi\b|detour|on your route|commute/i);
    const target = within(picker).getByRole("checkbox", { name: /Target Dover/ });
    expect(target).toBeDisabled();
    expect(within(picker).getByText("Prices coming soon")).toBeInTheDocument();
    const aldi = within(picker).getByRole("checkbox", { name: /ALDI Dover/ });
    expect(aldi).toBeChecked();
    await user.click(aldi);
    expect(readPreference("selectedStores")).toEqual(["walmart-dover"]);
  });

  it("saves the default trip preference", async () => {
    const user = userEvent.setup();
    render(<SettingsView products={[butter]} stores={stores} />);
    expect(screen.getByRole("radio", { name: "Balance" })).toBeChecked();
    await user.click(screen.getByText("Fewest stops"));
    expect(readPreference("selectedPreference")).toBe("fastest");
  });

  it("lists hidden brands and products by name, and shows them again on request", async () => {
    writePreference("hiddenBrands", ["Equate"]);
    writePreference("hiddenProducts", [butter.id, "gone-product"]);
    const user = userEvent.setup();
    render(<SettingsView products={[butter]} stores={stores} />);
    expect(screen.getByRole("list", { name: "Hidden products" })).toHaveTextContent("Peanut Delight Creamy Peanut Butter");
    // A hidden product that is no longer sold is still listed (by id) so it can be removed.
    expect(screen.getByRole("list", { name: "Hidden products" })).toHaveTextContent("gone-product");

    await user.click(screen.getByRole("button", { name: "Show Equate again" }));
    await user.click(screen.getByRole("button", { name: "Show Peanut Delight Creamy Peanut Butter again" }));
    expect(readPreference("hiddenBrands")).toEqual([]);
    expect(readPreference("hiddenProducts")).toEqual(["gone-product"]);
    expect(screen.getByText("No hidden brands.")).toBeInTheDocument();
  });
});
