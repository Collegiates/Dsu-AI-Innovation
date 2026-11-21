import { beforeEach, describe, expect, it, vi } from "vitest";
import { addToWaitlist, hideBrand, hideProduct, PREFERENCES_EVENT, readPreference, writePreference } from "./storage";

beforeEach(() => localStorage.clear());

describe("saved preferences", () => {
  it("returns defaults on a first visit", () => {
    expect(readPreference("hiddenBrands")).toEqual([]);
    expect(readPreference("waitlist")).toEqual([]);
    expect(readPreference("selectedPreference")).toBe("balanced");
  });

  it("saves and reads back valid values", () => {
    expect(writePreference("selectedPreference", "maxSavings")).toBe(true);
    expect(writePreference("waitlist", [{ groupKey: "shampoo-antidandruff", targetPrice: 3 }])).toBe(true);
    expect(readPreference("selectedPreference")).toBe("maxSavings");
    expect(readPreference("waitlist")).toEqual([{ groupKey: "shampoo-antidandruff", targetPrice: 3 }]);
  });

  it("falls back to defaults when the saved value is corrupted", () => {
    localStorage.setItem("grocerysave:waitlist", "{not json");
    localStorage.setItem("grocerysave:hiddenBrands", JSON.stringify("not a list"));
    localStorage.setItem("grocerysave:selectedPreference", JSON.stringify("teleport"));
    expect(readPreference("waitlist")).toEqual([]);
    expect(readPreference("hiddenBrands")).toEqual([]);
    expect(readPreference("selectedPreference")).toBe("balanced");
  });

  it("never crashes when storage is unavailable or throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    } as unknown as Storage;
    expect(readPreference("hiddenProducts", broken)).toEqual([]);
    expect(writePreference("hiddenProducts", ["x"], broken)).toBe(false);
    expect(readPreference("hiddenProducts", null)).toEqual([]);
    expect(writePreference("hiddenProducts", ["x"], null)).toBe(false);
  });

  it("refuses to save a value with the wrong shape", () => {
    expect(writePreference("waitlist", [{ groupKey: "" }])).toBe(false);
    expect(localStorage.getItem("grocerysave:waitlist")).toBeNull();
  });

  it("hides a brand or product once, without duplicates", () => {
    hideBrand("Great Value");
    expect(hideBrand(" great value ")).toEqual(["Great Value"]);
    hideProduct("p1");
    expect(hideProduct("p1")).toEqual(["p1"]);
  });

  it("saves the shopping list and tells open pages that it changed", () => {
    const listener = vi.fn();
    window.addEventListener(PREFERENCES_EVENT, listener);
    const list = [{ text: "milk", quantity: 2, label: "Same product" as const, productId: "walmart-dover--milk" }];
    expect(writePreference("list", list)).toBe(true);
    expect(readPreference("list")).toEqual(list);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(PREFERENCES_EVENT, listener);
  });

  it("returns an empty list when the saved list has a bad line", () => {
    localStorage.setItem("grocerysave:list", JSON.stringify([{ text: "milk", quantity: -1, label: "Same product", productId: null }]));
    expect(readPreference("list")).toEqual([]);
  });

  it("adds a group to the waitlist only once", () => {
    addToWaitlist("toothpaste-fluoride-whitening");
    expect(addToWaitlist("toothpaste-fluoride-whitening")).toEqual([{ groupKey: "toothpaste-fluoride-whitening" }]);
  });
});
