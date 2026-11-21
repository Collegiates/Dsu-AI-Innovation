import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Money } from "./Money";

describe("Money", () => {
  it("formats cents with the shared money helper and lines numbers up", () => {
    render(<Money cents={4152} />);
    const el = screen.getByText("$41.52");
    expect(el).toHaveClass("tabular-nums");
  });

  it("shows negatives with a minus sign and optional plus for gains", () => {
    const { rerender } = render(<Money cents={-150} />);
    expect(screen.getByText("−$1.50")).toBeInTheDocument();
    rerender(<Money cents={150} signed />);
    expect(screen.getByText("+$1.50")).toBeInTheDocument();
  });

  it("shows zero as $0.00", () => {
    render(<Money cents={0} signed />);
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });
});
