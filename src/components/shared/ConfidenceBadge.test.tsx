import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfidenceBadge } from "./ConfidenceBadge";

describe("ConfidenceBadge", () => {
  it.each(["Same product", "Similar", "No match"] as const)("shows the words '%s', not just a color", (label) => {
    render(<ConfidenceBadge label={label} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("uses the savings green only for 'Same product'", () => {
    const { rerender } = render(<ConfidenceBadge label="Same product" />);
    expect(screen.getByText("Same product")).toHaveClass("text-savings");
    rerender(<ConfidenceBadge label="Similar" />);
    expect(screen.getByText("Similar")).not.toHaveClass("text-savings");
  });
});
