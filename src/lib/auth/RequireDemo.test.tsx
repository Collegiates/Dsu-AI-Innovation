import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInDemo, signOutDemo } from "./demo";
import { RequireDemo } from "./RequireDemo";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));

beforeEach(() => {
  localStorage.clear();
  replace.mockClear();
});

describe("RequireDemo", () => {
  it("shows the page after the demo login", () => {
    signInDemo();
    render(<RequireDemo>Secret settings</RequireDemo>);
    expect(screen.getByText("Secret settings")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("sends visitors without the demo login back to the landing page, without showing the page", () => {
    render(<RequireDemo>Secret settings</RequireDemo>);
    expect(screen.queryByText("Secret settings")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("reacts at once when the demo login is turned off on an open page", () => {
    signInDemo();
    render(<RequireDemo>Secret settings</RequireDemo>);
    act(() => signOutDemo());
    expect(screen.queryByText("Secret settings")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/");
  });
});
