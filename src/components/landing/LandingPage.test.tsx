import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { APP_NAME } from "@/lib/config/app";
import { CountUp, formatStat } from "./CountUp";
import { cubicPoint, pinPoint, ROUTE } from "./geometry";
import { LandingPage } from "./LandingPage";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

describe("landing page", () => {
  it("leads with the headline and sends every 'Try the demo' button to the demo login", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Save on the drive you already make." })).toBeInTheDocument();
    const demoLinks = screen.getAllByRole("link", { name: /Try the demo/ });
    expect(demoLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of demoLinks) expect(link).toHaveAttribute("href", "/login");
  });

  it("uses the app name from config, never a hard-coded one", () => {
    render(<LandingPage />);
    expect(screen.getAllByText(APP_NAME).length).toBeGreaterThan(0);
  });

  it("describes the animated drawing in words, including the highlighted saving", () => {
    render(<LandingPage />);
    expect(screen.getByRole("img", { name: /DSU to Home .* \$4\.21 saved/ })).toBeInTheDocument();
  });

  it("shows the three steps in order", () => {
    render(<LandingPage />);
    const steps = within(screen.getByRole("region", { name: "How it works" })).getAllByRole("heading", { level: 3 });
    expect(steps.map((s) => s.textContent)).toEqual(["Step 1: Pick your stores", "Step 2: Add your list", "Step 3: We find the cheapest stop"]);
  });

  it("shows each stat with its final value and names the sources, labeling the demo estimate as illustrative", () => {
    render(<LandingPage />);
    const stats = screen.getByRole("region", { name: "By the numbers" });
    for (const text of ["32.6%", "88%", "$219"]) expect(within(stats).getAllByText(text).length).toBeGreaterThan(0);
    expect(stats).toHaveTextContent(/USDA Economic Research Service/);
    expect(stats).toHaveTextContent(/Axonify/);
    expect(stats).toHaveTextContent(/illustrative/);
  });

  it("states who does the math and who does the words", () => {
    render(<LandingPage />);
    for (const text of ["Code does the math.", "AI does the words.", "Every price links to its store page."]) expect(screen.getByText(text)).toBeInTheDocument();
  });
});

describe("count-up numbers", () => {
  it("formats numbers the same way while counting and at the end", () => {
    expect(formatStat(32.6, { decimals: 1, suffix: "%" })).toBe("32.6%");
    expect(formatStat(219, { prefix: "$" })).toBe("$219");
    expect(formatStat(1234.5, { decimals: 1 })).toBe("1,234.5");
  });

  it("renders the final number up front, so it is right without JavaScript or motion", () => {
    render(<CountUp value={88} suffix="%" />);
    expect(screen.getAllByText("88%")).toHaveLength(2);
  });
});

describe("hero route geometry", () => {
  it("puts pins exactly on the route: each curve starts and ends where it should", () => {
    expect(pinPoint(1, 0)).toEqual(ROUTE.start);
    expect(pinPoint(1, 1)).toEqual(ROUTE.first[2]);
    expect(pinPoint(2, 1)).toEqual(ROUTE.second[2]);
    expect(cubicPoint({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 10 }, { x: 10, y: 10 }, 0.5)).toEqual({ x: 5, y: 5 });
  });
});
