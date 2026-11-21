"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { DEMO_EVENT, isDemoSignedIn } from "./demo";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(DEMO_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(DEMO_EVENT, onChange);
  };
}

/**
 * Whether the demo login was used: true or false in the browser, and undefined during the server render,
 * before the browser's saved flag can be read. Example: const signedIn = useDemoSignedIn().
 */
export function useDemoSignedIn(): boolean | undefined {
  return useSyncExternalStore<boolean | undefined>(subscribe, () => isDemoSignedIn(), () => undefined);
}

/**
 * Shows a page only after the demo login; otherwise sends the visitor back to the landing page.
 * While the browser is still checking, a placeholder is shown so the page never flashes.
 * Example: <RequireDemo><SettingsView /></RequireDemo>.
 */
export function RequireDemo({ children }: { children: ReactNode }) {
  const signedIn = useDemoSignedIn();
  const router = useRouter();
  useEffect(() => {
    if (signedIn === false) router.replace("/");
  }, [signedIn, router]);

  if (signedIn !== true) {
    return (
      <div aria-busy="true" aria-label={signedIn === false ? "Going to the home page" : "Checking the demo login"}>
        <LoadingSkeleton className="h-64" />
      </div>
    );
  }
  return <>{children}</>;
}
