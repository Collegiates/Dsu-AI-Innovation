import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readPreference, writePreference } from "@/lib/preferences/storage";
import { makeProduct, makeStore } from "@/lib/trip/test-fixtures";
import { SettingsView } from "./SettingsView";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const stores = [{ ...makeStore("aldi-dover", 4, 1.2), chain: "ALDI" }, { ...makeStore("walmart-dover", 0, 0), chain: "Walmart" }];
const butter = makeProduct("aldi-dover", "Creamy Peanut Butter", 1.65, { brand: "Peanut Delight" });

beforeEach(() => localStorage.clear());

describe("Settings", () => {
  it("shows the commute and the stores on it, nearest first, with their detours", () => {
    render(<SettingsView products={[butter]} stores={stores} />);
    expect(screen.getByRole("region", { name: "Commute" })).toHaveTextContent("DSU → Home");
    const rows = within(screen.getByRole("region", { name: "Stores on your route" })).getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getAllByRole("cell")[0].querySelector("p")?.textContent)).toEqual(["Walmart", "ALDI"]);
    expect(rows[0]).toHaveTextContent("On your route");
    expect(rows[1]).toHaveTextContent("+4 min · 1.2 mi");
  });

  it("saves the default trip preference", async () => {
    const user = userEvent.setup();
    render(<SettingsView products={[butter]} stores={stores} />);
    expect(screen.getByRole("radio", { name: "Balance" })).toBeChecked();
    await user.click(screen.getByText("Get home fastest"));
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
