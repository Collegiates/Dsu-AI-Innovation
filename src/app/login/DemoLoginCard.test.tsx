import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isDemoSignedIn } from "@/lib/auth/demo";
import { APP_NAME } from "@/lib/config/app";
import { DemoLoginCard } from "./DemoLoginCard";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

beforeEach(() => {
  localStorage.clear();
  push.mockClear();
});

describe("demo login", () => {
  it("shows the app name from config and the no-sign-up note", () => {
    render(<DemoLoginCard />);
    expect(screen.getByRole("link", { name: APP_NAME })).toHaveAttribute("href", "/");
    expect(screen.getByText("Demo account — no sign-up needed.")).toBeInTheDocument();
  });

  it("signs in as the demo shopper and goes to the plan", async () => {
    const user = userEvent.setup();
    render(<DemoLoginCard />);
    await user.click(screen.getByRole("button", { name: "Continue as James (demo)" }));
    expect(isDemoSignedIn()).toBe(true);
    expect(push).toHaveBeenCalledWith("/plan");
  });

  it("says so, and stays put, when the browser blocks saving", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const user = userEvent.setup();
    render(<DemoLoginCard />);
    await user.click(screen.getByRole("button", { name: "Continue as James (demo)" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/blocked saving/);
    expect(push).not.toHaveBeenCalled();
    setItem.mockRestore();
  });
});
