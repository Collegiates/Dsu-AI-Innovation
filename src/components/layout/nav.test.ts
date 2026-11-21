import { describe, expect, it } from "vitest";
import { activeNavItem, NAV_ITEMS } from "./nav";

describe("activeNavItem", () => {
  it("marks the Dashboard on /plan, where the demo login lands", () => {
    expect(activeNavItem("/plan")?.label).toBe("Dashboard");
  });

  it("marks the page for nested addresses too", () => {
    expect(activeNavItem("/trip")?.label).toBe("Trip Plan");
    expect(activeNavItem("/deals/anything")?.label).toBe("Deal Watch");
  });

  it("marks nothing on the landing page, the login page or an unknown address", () => {
    expect(activeNavItem("/")).toBeUndefined();
    expect(activeNavItem("/login")).toBeUndefined();
    expect(activeNavItem("/planner")).toBeUndefined();
  });

  it("regression: the Dashboard link pointed at the landing page instead of /plan", () => {
    expect(NAV_ITEMS.find((item) => item.label === "Dashboard")?.href).toBe("/plan");
    expect(NAV_ITEMS.some((item) => item.href === "/")).toBe(false);
  });
});
