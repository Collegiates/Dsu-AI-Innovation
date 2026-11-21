import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { APP_NAME } from "@/lib/config/app";
import Home from "./page";

describe("home page", () => {
  it("shows the app name as the main heading", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: APP_NAME })).toBeInTheDocument();
  });
});
