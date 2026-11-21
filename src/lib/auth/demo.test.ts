import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_EVENT, DEMO_FLAG_KEY, isDemoSignedIn, signInDemo, signOutDemo } from "./demo";

beforeEach(() => localStorage.clear());

describe("demo sign-in", () => {
  it("is off on a first visit, on after signing in, and off after signing out", () => {
    expect(isDemoSignedIn()).toBe(false);
    expect(signInDemo()).toBe(true);
    expect(isDemoSignedIn()).toBe(true);
    signOutDemo();
    expect(isDemoSignedIn()).toBe(false);
  });

  it("stores only a flag, nothing personal", () => {
    signInDemo();
    expect(localStorage.getItem(DEMO_FLAG_KEY)).toBe("true");
    expect(Object.keys(localStorage)).toEqual([DEMO_FLAG_KEY]);
  });

  it("tells open pages when it changes", () => {
    const listener = vi.fn();
    window.addEventListener(DEMO_EVENT, listener);
    signInDemo();
    signOutDemo();
    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener(DEMO_EVENT, listener);
  });

  it("treats any other saved value as signed out, and never crashes when storage is blocked", () => {
    localStorage.setItem(DEMO_FLAG_KEY, "yes please");
    expect(isDemoSignedIn()).toBe(false);
    const blocked = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
      removeItem: () => {
        throw new Error("SecurityError");
      },
    } as unknown as Storage;
    expect(isDemoSignedIn(blocked)).toBe(false);
    expect(signInDemo(blocked)).toBe(false);
    expect(signInDemo(null)).toBe(false);
    expect(() => signOutDemo(blocked)).not.toThrow();
  });
});
