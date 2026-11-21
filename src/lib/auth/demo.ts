/**
 * The localStorage key that marks "signed in to the demo". It holds only the word "true": no name, no password,
 * nothing personal. This is a demo switch, not security; anyone can set it, and no real data sits behind it.
 */
export const DEMO_FLAG_KEY = "grocerysave:demo";

/** The browser event fired when the demo sign-in changes, so open pages can react at once. */
export const DEMO_EVENT = "grocerysave:demo-session";

/** Where the demo login sends the shopper. */
export const DEMO_HOME = "/plan";

function defaultStorage(): Storage | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DEMO_EVENT));
}

/**
 * Says whether the demo login was used in this browser. Returns false when storage is blocked or unavailable.
 * Example: isDemoSignedIn() → true after "Continue as James (demo)".
 */
export function isDemoSignedIn(storage: Storage | null = defaultStorage()): boolean {
  try {
    return storage?.getItem(DEMO_FLAG_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Turns the demo sign-in on. Returns false if the browser won't save it (private mode), so the caller can say so.
 * Example: signInDemo() then router.push("/plan").
 */
export function signInDemo(storage: Storage | null = defaultStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(DEMO_FLAG_KEY, "true");
    notify();
    return true;
  } catch {
    return false;
  }
}

/** Turns the demo sign-in off. Example: signOutDemo() sends guarded pages back to the landing page. */
export function signOutDemo(storage: Storage | null = defaultStorage()): void {
  try {
    storage?.removeItem(DEMO_FLAG_KEY);
    notify();
  } catch {
    // Nothing to undo if storage is blocked.
  }
}
